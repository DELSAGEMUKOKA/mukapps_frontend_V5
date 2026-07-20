Guide d'intégration — Système Kiosque de Pointage (Token B)
Vue d'ensemble
Chaque borne de pointage est identifiée par un token unique (ks_live_...) stocké dans la base de données. Ce token est envoyé dans l'en-tête Authorization de chaque requête de scan.


Borne physique  →  localStorage["mukapp_kiosk_token"]  →  Authorization: Bearer ks_live_xxx
                                                         →  POST /api/rh/qrcode/scan
                                                         →  Backend valide kiosque → identifie entreprise
                                                         →  Enregistre pointage
1. Gestion des kiosques (Interface Admin)
Toutes ces routes nécessitent un JWT valide + module rh actif + permission manage_kiosks.

Créer un kiosque

POST /api/rh/kiosks
Authorization: Bearer <jwt_admin>
Content-Type: application/json

{
  "name": "Entrée Principale"
}
Réponse 201 :


{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Entrée Principale",
    "token": "ks_live_a1b2c3d4e5f6...",
    "status": "ACTIVE",
    "createdAt": "2026-06-06T18:00:00.000Z"
  }
}
Important : Le token n'est retourné qu'à la création ou lors d'une régénération. Il n'apparaît jamais dans la liste.

Lister les kiosques

GET /api/rh/kiosks
Authorization: Bearer <jwt_admin>
Réponse 200 :


{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Entrée Principale",
      "status": "ACTIVE",
      "createdAt": "...",
      "updatedAt": "..."
    }
  ]
}
Activer / Désactiver un kiosque

PUT /api/rh/kiosks/:id
Authorization: Bearer <jwt_admin>
Content-Type: application/json

{
  "status": "INACTIVE"
}
Valeurs valides pour status : "ACTIVE" | "INACTIVE"

Vous pouvez aussi renommer sans changer le statut :


{ "name": "Réception RDC" }
Régénérer le token
Révoque immédiatement l'ancien token. La borne concernée sera automatiquement déconnectée lors de son prochain scan.


POST /api/rh/kiosks/:id/regenerate-token
Authorization: Bearer <jwt_admin>
Réponse 200 :


{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Entrée Principale",
    "token": "ks_live_nouveau_token...",
    "status": "ACTIVE"
  }
}
Supprimer un kiosque

DELETE /api/rh/kiosks/:id
Authorization: Bearer <jwt_admin>
2. Intégration de la borne (Frontend Kiosque)
Stockage du token
Le token kiosque est stocké côté client dans localStorage. Clé recommandée : mukapp_kiosk_token.


// Sauvegarder
localStorage.setItem('mukapp_kiosk_token', 'ks_live_...');

// Lire
const token = localStorage.getItem('mukapp_kiosk_token');

// Supprimer (lors d'une reconfiguration)
localStorage.removeItem('mukapp_kiosk_token');
Flow de démarrage

Au chargement de la page
  │
  ├─ localStorage contient un token ?
  │      OUI → Afficher l'interface de pointage
  │      NON → Afficher l'écran de configuration
  │
  └─ (Écran de config) Admin entre le token ks_live_...
         │
         ├─ Valider le format (doit commencer par "ks_live_")
         ├─ Tester via une requête de sonde (voir ci-dessous)
         │      401/403 → Token invalide/kiosque désactivé → afficher erreur
         │      400/200 → Token accepté → sauvegarder dans localStorage
         └─ Afficher l'interface de pointage
Requête de sonde pour validation du token :


const res = await fetch('/api/rh/qrcode/scan', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + tokenSaisi,
  },
  body: JSON.stringify({ token: '__probe__', scanType: 'check_in' }),
});

if (res.status === 401 || res.status === 403) {
  // Token invalide ou kiosque désactivé
} else {
  // Token kiosque accepté (400 = validation corps = normal)
  localStorage.setItem('mukapp_kiosk_token', tokenSaisi);
}
Effectuer un scan

POST /api/rh/qrcode/scan
Authorization: Bearer ks_live_xxx
Content-Type: application/json

{
  "token": "<qrToken de l'employé>",
  "scanType": "check_in"
}
scanType : "check_in" (arrivée) | "check_out" (départ)
token : extrait du QR Code de l'employé (format JSON { "t": "...", "eid": "..." }, lire le champ t)
Réponse 200 — Arrivée enregistrée :


{
  "success": true,
  "data": {
    "action": "checked_in",
    "employee": {
      "firstName": "Marie",
      "lastName": "Dupont",
      "employeeNumber": "EMP-0042",
      "position": "Caissière"
    },
    "checkIn": "2026-06-06T07:58:00.000Z",
    "isLate": false,
    "notes": null,
    "message": "Bienvenue Marie Dupont ! Arrivée enregistrée."
  }
}
Réponse 200 — Départ enregistré :


{
  "success": true,
  "data": {
    "action": "checked_out",
    "employee": { "firstName": "Marie", "lastName": "Dupont", "employeeNumber": "EMP-0042" },
    "checkIn": "2026-06-06T07:58:00.000Z",
    "checkOut": "2026-06-06T17:03:00.000Z",
    "hoursWorked": 9.08,
    "message": "Au revoir Marie Dupont ! 9.08h travaillées aujourd'hui."
  }
}
Actions possibles dans data.action :

Valeur	Signification
checked_in	Arrivée enregistrée
checked_out	Départ enregistré
already_checked_in	Arrivée déjà pointée aujourd'hui
already_checked_out	Départ déjà pointé aujourd'hui
Vérifier le statut d'un employé

GET /api/rh/qrcode/scan/status?token=<qrToken>
Authorization: Bearer ks_live_xxx
Réponse 200 :


{
  "success": true,
  "data": {
    "employee": { "firstName": "Marie", "lastName": "Dupont", "employeeNumber": "EMP-0042" },
    "today": {
      "hasCheckedIn": true,
      "hasCheckedOut": false,
      "checkIn": "2026-06-06T07:58:00.000Z",
      "checkOut": null,
      "hoursWorked": null,
      "status": "DEPART_EN_COURS"
    }
  }
}
3. Gestion des erreurs
Erreurs kiosque
Code HTTP	code	Action recommandée
401	KIOSK_TOKEN_REQUIRED	Afficher l'écran de configuration
401	INVALID_KIOSK_TOKEN	Token inexistant → reconfigurer
403	KIOSK_INACTIVE	Borne désactivée → afficher message, effacer localStorage
Comportement obligatoire : Si le scan reçoit un 401 ou 403, effacer le token du localStorage et rediriger vers l'écran de configuration.


if (res.status === 401 || res.status === 403) {
  localStorage.removeItem('mukapp_kiosk_token');
  showSetupScreen();
  showError(json.message);
  return;
}
Erreurs employé
Code HTTP	code	Message à afficher
404	INVALID_TOKEN	QR Code invalide ou employé introuvable
403	EMPLOYEE_INACTIVE	Employé inactif — contacter le RH
400	DEPART_TOO_EARLY	Départ trop tôt — afficher json.message
400	—	Arrivée non enregistrée — scanner d'abord l'arrivée
4. Lecture du QR Code employé
Le QR Code d'un employé encode un objet JSON :


{ "t": "abc123...", "eid": "uuid-employe" }
Extraire uniquement le champ t pour l'envoyer dans le body du scan :


function parseQrData(rawString) {
  try {
    const parsed = JSON.parse(rawString);
    if (parsed && parsed.t) return parsed.t;
  } catch (_) {}
  return rawString; // fallback si pas JSON
}
5. Migration base de données
Avant déploiement, exécuter la migration pour créer la table rh_kiosks :


npx prisma migrate dev --name add_rh_kiosk
# ou en production :
npx prisma migrate deploy
6. Récapitulatif des endpoints
Méthode	Route	Auth	Description
POST	/api/rh/kiosks	JWT + manage_kiosks	Créer un kiosque
GET	/api/rh/kiosks	JWT + manage_kiosks	Lister les kiosques
PUT	/api/rh/kiosks/:id	JWT + manage_kiosks	Renommer / activer / désactiver
POST	/api/rh/kiosks/:id/regenerate-token	JWT + manage_kiosks	Régénérer le token
DELETE	/api/rh/kiosks/:id	JWT + manage_kiosks	Supprimer
POST	/api/rh/qrcode/scan	Token kiosque (ks_live_...)	Enregistrer un pointage
GET	/api/rh/qrcode/scan/status	Token kiosque (ks_live_...)	Statut du jour d'un employé





