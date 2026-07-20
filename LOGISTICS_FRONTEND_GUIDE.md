# Guide d'implémentation Frontend — Module Logistics

Ce guide est destiné au développeur frontend. Il décrit toutes les routes disponibles, les structures de données, les règles métier à respecter dans l'interface, et les comportements attendus pour chaque écran.

---

## 1. Authentification

Toutes les routes du module nécessitent un JWT valide dans le header :

```
Authorization: Bearer <token>
```

L'utilisateur doit avoir l'abonnement `logistics` actif sur son compte entreprise.

---

## 2. Permissions par rôle

Avant de rendre un bouton visible, vérifiez la permission de l'utilisateur connecté.

| Permission | SUPER_ADMIN | ADMIN | SUPERVISOR | OPERATOR |
|---|---|---|---|---|
| `dossier.view` | oui | oui | oui | oui |
| `dossier.create` | oui | oui | oui | non |
| `dossier.edit` | oui | oui | oui | non |
| `dossier.delete` | oui | oui | non | non |
| `dossier.change_status` | oui | oui | oui | non |
| `item.manage` | oui | oui | oui | non |
| `customs.view` | oui | oui | oui | oui |
| `customs.manage` | oui | oui | oui | non |
| `customs.approve` | oui | oui | non | non |
| `document.view` | oui | oui | oui | oui |
| `document.upload` | oui | oui | oui | oui |
| `document.delete` | oui | oui | oui | non |
| `cost.view` | oui | oui | oui | oui |
| `cost.manage` | oui | oui | oui | non |
| `cost.pay` | oui | oui | oui | non |
| `tracking.view` | oui | oui | oui | oui |
| `tracking.add` | oui | oui | oui | oui |
| `carrier.manage` | oui | oui | non | non |
| `tariff.manage` | oui | oui | non | non |
| `dashboard.view` | oui | oui | oui | oui |
| `reports.view` | oui | oui | oui | non |
| `container.view` | oui | oui | oui | oui |
| `container.manage` | oui | oui | oui | non |
| `container.change_status` | oui | oui | oui | non |
| `warehouse.view` | oui | oui | oui | oui |
| `warehouse.manage` | oui | oui | oui | non |
| `fleet.view` | oui | oui | oui | oui |
| `fleet.manage` | oui | oui | oui | non |
| `fleet.gps` | oui | oui | oui | oui |
| `finance.view` | oui | oui | oui | oui |
| `finance.manage` | oui | oui | non | non |

---

## 3. Valeurs énumérées (à utiliser dans les selects)

### Type de dossier
```
IMPORT | EXPORT | TRANSIT
```

### Modes de transport
```
SEA | AIR | ROAD | RAIL | MULTIMODAL
```

### Statuts de dossier
```
DRAFT | CONFIRMED | BOOKING_PLACED | GOODS_READY |
CUSTOMS_EXPORT | IN_TRANSIT | ARRIVED | CUSTOMS_IMPORT |
DELIVERED | CLOSED | CANCELLED
```

### Incoterms
```
EXW | FCA | CPT | CIP | DAP | DPU | DDP |
FAS | FOB | CFR | CIF
```

### Types de transporteur
```
SHIPPING_LINE | AIR_CARRIER | ROAD_CARRIER | RAIL_CARRIER | FREIGHT_FORWARDER | CUSTOMS_BROKER
```

### Catégories de frais
```
FREIGHT | CUSTOMS | HANDLING | INSURANCE | STORAGE | DEMURRAGE | AGENT_FEE | OTHER
```

### Types de déclaration douanière
```
IMPORT_DECLARATION | EXPORT_DECLARATION | TRANSIT_DECLARATION | TEMPORARY_ADMISSION
```

### Statuts de déclaration douanière
```
PENDING | SUBMITTED | UNDER_REVIEW | APPROVED | REJECTED
```

### Statuts de conteneur (11 étapes)
```
DRAFT | BOOKED | LOADED | AT_ORIGIN | IN_TRANSIT |
AT_PORT | CUSTOMS | INLAND_TRANSPORT | ARRIVED | DELIVERED | CLOSED
```

### Types de conteneur
```
DRY_20 | DRY_40 | DRY_40HC | REEFER_20 | REEFER_40 | OPEN_TOP | FLAT_RACK | TANK
```

### Statuts de véhicule
```
AVAILABLE | ON_DELIVERY | MAINTENANCE | OUT_OF_SERVICE
```

### Types de véhicule
```
TRUCK | VAN | MOTORCYCLE | PICKUP | TRAILER | OTHER
```

### Statuts de livraison
```
PLANNED | DEPARTED | ARRIVED | CANCELLED
```

### Statuts de transfert entrepôt
```
PENDING | IN_TRANSIT | COMPLETED | CANCELLED
```

### Types d'entrepôt
```
MAIN | TRANSIT | PORT | CUSTOMS | STORE
```

### Types de lettre de crédit
```
DOCUMENTARY_CREDIT | STANDBY | REVOLVING | BACK_TO_BACK
```

### Statuts de lettre de crédit
```
DRAFT | ISSUED | CONFIRMED | AMENDED | UTILIZED | EXPIRED | CANCELLED
```

### Types de garantie bancaire
```
PERFORMANCE | ADVANCE_PAYMENT | BID_BOND | PAYMENT | RETENTION
```

### Statuts de garantie bancaire
```
ACTIVE | CLAIMED | EXPIRED | RELEASED
```

### Types de couverture d'assurance
```
ALL_RISK | BASIC | WAR_RISK | TOTAL_LOSS
```

### Statuts d'assurance
```
ACTIVE | CLAIMED | EXPIRED | CANCELLED
```

### Sources de position GPS
```
TRACCAR | MANUAL | APP
```

### Sources de taux de change
```
MANUAL | BCC | BCE | API
```

---

## 4. Dashboard

### GET `/api/logistics/dashboard`
Retourne les KPIs principaux, y compris les statistiques sur les conteneurs et la flotte.

**Réponse :**
```json
{
  "overview": {
    "totalDossiers": 42,
    "activeDossiers": 12,
    "overdueDossiers": 3
  },
  "dossiersByStatus": [
    { "status": "IN_TRANSIT", "count": 5 },
    { "status": "CONFIRMED", "count": 3 }
  ],
  "dossiersByType": [
    { "type": "IMPORT", "count": 28 },
    { "type": "EXPORT", "count": 14 }
  ],
  "costs": {
    "monthTotal": 12500.00,
    "monthCount": 8,
    "unpaidTotal": 3400.00,
    "unpaidCount": 2
  },
  "containers": {
    "total": 24,
    "arrived": 8,
    "inTransit": 10,
    "inCustoms": 3,
    "pending": 3,
    "byStatus": [
      { "status": "IN_TRANSIT", "_count": { "_all": 10 } },
      { "status": "ARRIVED", "_count": { "_all": 8 } }
    ]
  },
  "vehicles": {
    "total": 6,
    "available": 4,
    "onDelivery": 2,
    "byStatus": [
      { "status": "AVAILABLE", "_count": { "_all": 4 } },
      { "status": "ON_DELIVERY", "_count": { "_all": 2 } }
    ]
  },
  "recentDossiers": [...],
  "alerts": {
    "etaOverdue": [...],
    "pendingCustoms": [...],
    "unpaidCosts": [...]
  }
}
```

### GET `/api/logistics/dashboard/active`
Liste de tous les dossiers actifs (hors DRAFT, CLOSED, CANCELLED), triés par ETA croissante.

### GET `/api/logistics/dashboard/alerts`
Retourne les 3 types d'alertes actives :

```json
{
  "etaOverdue": [
    { "type": "ETA_OVERDUE", "dossierId": "...", "reference": "IMP-2026-12345", "eta": "2026-06-10", "status": "IN_TRANSIT" }
  ],
  "pendingCustoms": [
    { "type": "CUSTOMS_PENDING", "declarationId": "...", "dossierId": "...", "reference": "IMP-2026-12345" }
  ],
  "unpaidCosts": [
    { "type": "UNPAID_COST_30_DAYS", "costId": "...", "dossierId": "...", "reference": "...", "amount": 1200.00, "currency": "USD" }
  ]
}
```

**Recommandation UI :** afficher un badge rouge sur l'icône du module si `alerts` contient des entrées.

### GET `/api/logistics/dashboard/reports?startDate=2026-01-01&endDate=2026-06-30`

Rapport analytique par période. Paramètres optionnels : `startDate`, `endDate` (format ISO). Si absents, tous les dossiers sont inclus.

**Réponse :**
```json
{
  "dossiers": [
    {
      "id": "clx...",
      "reference": "IMP-2026-12345",
      "type": "IMPORT",
      "status": "CLOSED",
      "createdAt": "2026-01-15T10:00:00.000Z",
      "atd": "2026-02-01T00:00:00.000Z",
      "ata": "2026-03-20T00:00:00.000Z"
    }
  ],
  "costsByCategory": [
    { "category": "FREIGHT", "total": 45000.00, "count": 8 },
    { "category": "CUSTOMS", "total": 12500.00, "count": 5 },
    { "category": "HANDLING", "total": 3200.00, "count": 10 }
  ],
  "carrierPerformance": [
    { "carrierId": "clx...", "_count": { "id": 12 } }
  ]
}
```

**Notes :**
- `dossiers` : liste brute de tous les dossiers de la période, sans pagination. Calculez les métriques dérivées côté frontend (durée moyenne transit = `ata - atd`, taux de complétion, etc.)
- `costsByCategory` : totaux agrégés par catégorie sur la période (le filtre date s'applique à la date de création du frais)
- `carrierPerformance` : nombre de dossiers clôturés par transporteur — jointurez avec `/api/logistics/carriers` pour avoir les noms

---

## 5. Dossiers

### Liste — GET `/api/logistics/dossiers`

**Query params disponibles :**
| Param | Type | Description |
|---|---|---|
| `page` | number | Page (défaut: 1) |
| `limit` | number | Par page (défaut: 20) |
| `type` | string | `IMPORT`, `EXPORT`, `TRANSIT` |
| `status` | string | Voir liste des statuts |
| `transportMode` | string | `SEA`, `AIR`, etc. |
| `search` | string | Recherche sur référence, pays, notes |

**Réponse :**
```json
{
  "dossiers": [
    {
      "id": "clx...",
      "reference": "IMP-2026-12345",
      "type": "IMPORT",
      "status": "IN_TRANSIT",
      "transportMode": "SEA",
      "originCountry": "CN",
      "destCountry": "CD",
      "eta": "2026-07-15T00:00:00.000Z",
      "carrier": { "id": "...", "name": "MSC", "type": "SHIPPING_LINE" },
      "_count": { "items": 3, "documents": 2, "costs": 4 },
      "createdAt": "2026-06-01T10:00:00.000Z"
    }
  ],
  "total": 42,
  "page": 1,
  "limit": 20
}
```

---

### Créer — POST `/api/logistics/dossiers`

```json
{
  "type": "IMPORT",
  "transportMode": "SEA",
  "carrierId": "clx...",
  "incoterm": "CIF",
  "currency": "USD",
  "originCountry": "CN",
  "originPort": "Shanghai",
  "destCountry": "CD",
  "destPort": "Dar es Salaam",
  "etd": "2026-07-01",
  "eta": "2026-08-15",
  "totalWeight": 5000,
  "totalVolume": 25.5,
  "declaredValue": 85000,
  "shipperId": "client_id_optionnel",
  "consigneeId": "client_id_optionnel",
  "forwarderId": "client_id_optionnel",
  "notes": "Commande n°CM-2026-001"
}
```

La `reference` est générée automatiquement (ex. `IMP-2026-12345`).

---

### Détail — GET `/api/logistics/dossiers/:id`

Retourne le dossier complet avec toutes ses sous-ressources incluses :
- `carrier` — transporteur lié
- `items` — articles
- `customs` — déclarations douanières
- `documents` — documents joints
- `costs` — frais (avec résumé)
- `tracking` — historique de suivi

---

### Modifier — PUT `/api/logistics/dossiers/:id`

Mêmes champs que la création. Les dossiers `CLOSED` et `CANCELLED` sont bloqués en modification (erreur 400).

---

### Changer le statut — PATCH `/api/logistics/dossiers/:id/status`

```json
{ "status": "CONFIRMED" }
```

**Transitions autorisées :**
```
DRAFT           → CONFIRMED, CANCELLED
CONFIRMED       → BOOKING_PLACED, CANCELLED
BOOKING_PLACED  → GOODS_READY, CANCELLED
GOODS_READY     → CUSTOMS_EXPORT, IN_TRANSIT, CANCELLED
CUSTOMS_EXPORT  → IN_TRANSIT, CANCELLED
IN_TRANSIT      → ARRIVED
ARRIVED         → CUSTOMS_IMPORT, DELIVERED
CUSTOMS_IMPORT  → DELIVERED
DELIVERED       → CLOSED
CLOSED          → (aucune)
CANCELLED       → (aucune)
```

**Comportement automatique du serveur :**
- Passage à `IN_TRANSIT` → le champ `atd` (Actual Time of Departure) est renseigné automatiquement si vide
- Passage à `ARRIVED` → le champ `ata` (Actual Time of Arrival) est renseigné automatiquement si vide

---

### Supprimer — DELETE `/api/logistics/dossiers/:id`

Uniquement possible si le statut est `DRAFT`.

---

## 6. Articles (Items)

> **Pagination :** les sous-ressources `items`, `costs` et `tracking` retournent toujours l'intégralité des enregistrements du dossier (pas de pagination serveur). Un dossier contenant des milliers d'articles est peu probable ; si le volume devient problématique, ajouter une pagination côté serveur sera une évolution future.

### Liste — GET `/api/logistics/dossiers/:dossierId/items`

Retourne un tableau JSON (pas d'objet enveloppe).

```json
[
  {
    "id": "clx...",
    "description": "Composants électroniques",
    "hsCode": "8542.31",
    "quantity": 1000,
    "unit": "pcs",
    "unitValue": 12.50,
    "totalValue": 12500.00,
    "countryOfOrigin": "CN",
    "productId": null,
    "createdAt": "2026-06-01T10:00:00.000Z"
  }
]
```

**Champs obligatoires à la création :** `description`, `quantity`, `unitValue`.

### Créer — POST `/api/logistics/dossiers/:dossierId/items`

```json
{
  "description": "Composants électroniques",
  "hsCode": "8542.31",
  "quantity": 1000,
  "unit": "pcs",
  "unitValue": 12.50,
  "countryOfOrigin": "CN",
  "productId": "id_produit_optionnel"
}
```

**Note :** `totalValue` est calculé automatiquement : `quantity × unitValue`.

### Modifier — PUT `/api/logistics/dossiers/:dossierId/items/:itemId`
### Supprimer — DELETE `/api/logistics/dossiers/:dossierId/items/:itemId`

---

## 7. Documents

### Liste — GET `/api/logistics/dossiers/:dossierId/documents`

Retourne tous les documents du dossier (pas de pagination — les dossiers ont rarement plus de quelques dizaines de documents).

### Ajouter — POST `/api/logistics/dossiers/:dossierId/documents`

```json
{
  "type": "BILL_OF_LADING",
  "name": "BL_MSC_2026001.pdf",
  "url": "https://votre-bucket.s3.amazonaws.com/docs/BL_MSC_2026001.pdf",
  "size": 245678,
  "mimeType": "application/pdf"
}
```

**Workflow d'upload recommandé :**

Le backend ne gère pas directement le stockage des fichiers. Le frontend doit :

1. Demander une URL signée à votre service de stockage (S3, Supabase Storage, Cloudflare R2, etc.)
2. Uploader le fichier directement via un `PUT` vers l'URL signée (upload côté client)
3. Une fois l'upload confirmé, envoyer l'URL publique ou permanente à ce endpoint

**Exemple avec Supabase Storage :**
```js
// 1. Upload vers Supabase Storage
const { data, error } = await supabase.storage
  .from('logistics-docs')
  .upload(`dossiers/${dossierId}/${file.name}`, file);

// 2. Récupérer l'URL publique
const { data: urlData } = supabase.storage
  .from('logistics-docs')
  .getPublicUrl(data.path);

// 3. Enregistrer dans l'API
await fetch(`/api/logistics/dossiers/${dossierId}/documents`, {
  method: 'POST',
  body: JSON.stringify({ type: 'BILL_OF_LADING', name: file.name, url: urlData.publicUrl, size: file.size, mimeType: file.type }),
});
```

**Types de document courants :**
```
BILL_OF_LADING | AIR_WAYBILL | PACKING_LIST | COMMERCIAL_INVOICE |
CERTIFICATE_OF_ORIGIN | CUSTOMS_DECLARATION | INSURANCE_CERTIFICATE |
PHYTOSANITARY | OTHER
```

### Supprimer — DELETE `/api/logistics/dossiers/:dossierId/documents/:did`

---

## 8. Frais (Costs)

### Liste — GET `/api/logistics/dossiers/:dossierId/costs`

```json
{
  "costs": [
    {
      "id": "clx...",
      "category": "FREIGHT",
      "description": "Fret maritime MSC",
      "currency": "USD",
      "amount": 3500.00,
      "invoiceRef": "MSC-INV-2026-001",
      "isPaid": false,
      "paidAt": null
    }
  ],
  "summary": {
    "byCategory": { "FREIGHT": 3500.00, "CUSTOMS": 1200.00 },
    "totalPaid": 1200.00,
    "totalUnpaid": 3500.00,
    "grandTotal": 4700.00
  }
}
```

### Créer — POST `/api/logistics/dossiers/:dossierId/costs`

```json
{
  "category": "FREIGHT",
  "description": "Fret maritime MSC",
  "currency": "USD",
  "amount": 3500.00,
  "invoiceRef": "MSC-INV-2026-001",
  "supplierId": "id_fournisseur_optionnel"
}
```

### Modifier — PUT `/api/logistics/dossiers/:dossierId/costs/:cid`
### Supprimer — DELETE `/api/logistics/dossiers/:dossierId/costs/:cid`

### Marquer payé — PATCH `/api/logistics/dossiers/:dossierId/costs/:cid/pay`

Corps vide `{}`. Met `isPaid: true` et renseigne `paidAt` automatiquement.

---

## 9. Douane (Customs)

### Liste — GET `/api/logistics/dossiers/:dossierId/customs`

### Créer — POST `/api/logistics/dossiers/:dossierId/customs`

```json
{
  "declarationType": "IMPORT_DECLARATION",
  "declarationNo": "CD2026-001234",
  "regime": "40",
  "customsOffice": "Kasumbalesa",
  "customsDuty": 5250.00,
  "vat": 8800.00,
  "excise": 0,
  "otherTaxes": 120.00,
  "notes": "Déclaration principale import"
}
```

Le champ `totalTaxes` est calculé automatiquement par le serveur.

### Modifier — PUT `/api/logistics/dossiers/:dossierId/customs/:cid`
Une déclaration `APPROVED` ou `REJECTED` ne peut plus être modifiée (erreur 400).

### Soumettre — PATCH `/api/logistics/dossiers/:dossierId/customs/:cid/submit`
### Approuver — PATCH `/api/logistics/dossiers/:dossierId/customs/:cid/approve`
### Rejeter — PATCH `/api/logistics/dossiers/:dossierId/customs/:cid/reject`

```json
{ "reason": "Motif du rejet" }
```

### Calculer les taxes — GET `/api/logistics/dossiers/:dossierId/customs/calculate`

Pré-calcule les taxes depuis les articles et le barème. Utile pour pré-remplir le formulaire de déclaration.

---

## 10. Suivi (Tracking)

### Liste — GET `/api/logistics/dossiers/:dossierId/tracking`

Retourne tous les événements du dossier sans pagination, triés du plus récent au plus ancien. Affichez-les sous forme de timeline verticale.

```json
[
  {
    "id": "clx...",
    "eventDate": "2026-07-10T08:30:00.000Z",
    "location": "Port de Shanghaï, CN",
    "status": "GOODS_LOADED",
    "description": "Marchandises chargées sur MSC Loreto",
    "createdAt": "2026-07-10T09:00:00.000Z"
  }
]
```

### Ajouter — POST `/api/logistics/dossiers/:dossierId/tracking`

**Champs obligatoires :** au moins `location` ou `description`.

```json
{
  "eventDate": "2026-07-10T08:30:00.000Z",
  "location": "Port de Shanghaï, CN",
  "status": "GOODS_LOADED",
  "description": "Marchandises chargées sur MSC Loreto"
}
```

`eventDate` est optionnel, défaut à `now()` si absent.

---

## 11. Transporteurs (Carriers)

### Liste — GET `/api/logistics/carriers`

Retourne la liste complète sans pagination (les transporteurs sont peu nombreux par entreprise — en général < 50). Filtrez côté client si nécessaire.

Query params optionnels : `type`, `isActive`, `search` (recherche sur nom, code, pays).

```json
[
  {
    "id": "clx...",
    "name": "MSC",
    "type": "SHIPPING_LINE",
    "code": "MSC",
    "country": "CH",
    "contactEmail": "ops@msc.com",
    "contactPhone": "+41 22 703 8888",
    "isActive": true,
    "createdAt": "2026-06-01T10:00:00.000Z"
  }
]
```

### Créer — POST `/api/logistics/carriers`

**Champs obligatoires :** `name`.

```json
{
  "name": "MSC",
  "type": "SHIPPING_LINE",
  "code": "MSC",
  "country": "CH",
  "contactEmail": "ops@msc.com",
  "contactPhone": "+41 22 703 8888"
}
```

### Détail — GET `/api/logistics/carriers/:id`
### Modifier — PUT `/api/logistics/carriers/:id`
### Supprimer — DELETE `/api/logistics/carriers/:id`

Un transporteur lié à au moins un dossier ne peut pas être supprimé (erreur 409).

---

## 12. Barème douanier (Tariffs)

### Liste — GET `/api/logistics/tariffs`

Retourne la liste complète sans pagination, triée par code HS croissant.

Query params optionnels : `search` (recherche sur code HS ou description), `isActive`.

### Par code HS — GET `/api/logistics/tariffs/:hsCode`

Retourne le barème actif pour ce code HS exact. Erreur 404 si aucun barème actif n'existe.

### Créer — POST `/api/logistics/tariffs`

**Champs obligatoires :** `hsCode`, `description`.  
Le code HS doit être unique par entreprise (erreur 409 si déjà existant).

```json
{
  "hsCode": "8542.31",
  "description": "Circuits intégrés électroniques",
  "importDutyRate": 5.0,
  "vatRate": 20.0,
  "exciseRate": 0,
  "notes": "Taux en vigueur depuis janvier 2026"
}
```

Tous les taux sont en pourcentage.

### Modifier — PUT `/api/logistics/tariffs/:id`
### Supprimer — DELETE `/api/logistics/tariffs/:id`

---

## 13. Conteneurs (Containers)

Les conteneurs permettent de suivre individuellement chaque conteneur d'un dossier depuis la réservation jusqu'à la livraison finale. C'est via cette ressource que l'on sait combien de conteneurs sont arrivés, en transit, en douane, etc.

### Liste — GET `/api/logistics/dossiers/:dossierId/containers`

Inclut un champ calculé `summary` sur le dossier donnant l'état global :

```json
{
  "containers": [
    {
      "id": "clx...",
      "containerNumber": "MSCU1234567",
      "type": "DRY_40HC",
      "status": "IN_TRANSIT",
      "sealNumber": "SL-789456",
      "vesselName": "MSC Loreto",
      "voyageNumber": "VY2026-001",
      "originPort": "Shanghai",
      "destinationPort": "Dar es Salaam",
      "currentLocation": "Océan Indien",
      "eta": "2026-08-10T00:00:00.000Z",
      "arrivedAt": null,
      "weight": 18500,
      "volume": null,
      "notes": null,
      "items": [
        {
          "id": "clx...",
          "description": "Téléviseurs 55\"",
          "quantity": 200,
          "unit": "pcs",
          "unitValue": 120.00,
          "weight": 5000,
          "notes": "Marque Samsung"
        }
      ],
      "createdAt": "2026-06-01T10:00:00.000Z"
    }
  ],
  "summary": {
    "total": 5,
    "arrived": 2,
    "inTransit": 2,
    "inCustoms": 1,
    "pending": 0,
    "byStatus": { "IN_TRANSIT": 2, "ARRIVED": 2, "CUSTOMS": 1 },
    "globalStatus": "PARTIALLY_RECEIVED"
  }
}
```

**Valeurs possibles de `globalStatus` :**
| Valeur | Signification |
|---|---|
| `NO_CONTAINERS` | Aucun conteneur créé sur ce dossier |
| `PENDING` | Tous les conteneurs sont en phase préparatoire (DRAFT, BOOKED, LOADED) |
| `IN_TRANSIT` | Au moins un conteneur est en route, aucun n'est arrivé |
| `PARTIALLY_RECEIVED` | Au moins un conteneur est arrivé, mais pas tous |
| `ALL_RECEIVED` | Tous les conteneurs ont le statut ARRIVED, DELIVERED ou CLOSED |

**Recommandation UI :** Afficher `globalStatus` sur la card du dossier dans la liste. Exemple :
- `NO_CONTAINERS` → badge gris "Aucun conteneur"
- `IN_TRANSIT` → badge bleu "En transit"
- `PARTIALLY_RECEIVED` → badge orange "Partiellement reçu (2/5)"
- `ALL_RECEIVED` → badge vert "Tout reçu"

---

### Créer — POST `/api/logistics/dossiers/:dossierId/containers`

**Champs obligatoires :** `containerNumber`.

```json
{
  "containerNumber": "MSCU1234567",
  "type": "DRY_40HC",
  "sealNumber": "SL-789456",
  "vesselName": "MSC Loreto",
  "voyageNumber": "VY2026-001",
  "originPort": "Shanghai",
  "destinationPort": "Dar es Salaam",
  "eta": "2026-08-10",
  "weight": 18500,
  "notes": "Conteneur réfrigéré"
}
```

Le statut initial est toujours `DRAFT`.

---

### Détail — GET `/api/logistics/dossiers/:dossierId/containers/:id`

Retourne le conteneur avec ses items.

---

### Modifier — PUT `/api/logistics/dossiers/:dossierId/containers/:id`

Mêmes champs que la création. Un conteneur `CLOSED` ne peut plus être modifié.

---

### Changer le statut — PATCH `/api/logistics/dossiers/:dossierId/containers/:id/status`

```json
{ "status": "BOOKED" }
```

**Machine à états — transitions autorisées :**
```
DRAFT             → BOOKED
BOOKED            → LOADED, DRAFT
LOADED            → AT_ORIGIN, IN_TRANSIT
AT_ORIGIN         → IN_TRANSIT
IN_TRANSIT        → AT_PORT, ARRIVED
AT_PORT           → CUSTOMS, INLAND_TRANSPORT, ARRIVED
CUSTOMS           → INLAND_TRANSPORT, ARRIVED
INLAND_TRANSPORT  → ARRIVED
ARRIVED           → DELIVERED
DELIVERED         → CLOSED
CLOSED            → (aucune)
```

**Comportements automatiques du serveur lors du changement de statut :**
- `IN_TRANSIT` → `atd` renseigné si vide
- `ARRIVED` → `ata` renseigné si vide
- `CUSTOMS` → début du dédouanement
- `DELIVERED` → `deliveredAt` renseigné si vide

**Important :** N'afficher dans le menu que les transitions autorisées depuis le statut actuel.

---

### Supprimer — DELETE `/api/logistics/dossiers/:dossierId/containers/:id`

Uniquement possible si le statut est `DRAFT`.

---

### Gérer les articles d'un conteneur

#### Ajouter — POST `/api/logistics/dossiers/:dossierId/containers/:containerId/items`

**Champs obligatoires :** `description`.

```json
{
  "description": "Téléviseurs 55\"",
  "quantity": 200,
  "unit": "pcs",
  "unitValue": 120.00,
  "weight": 5000,
  "notes": "Marque Samsung"
}
```

#### Modifier — PUT `/api/logistics/dossiers/:dossierId/containers/:containerId/items/:itemId`
#### Supprimer — DELETE `/api/logistics/dossiers/:dossierId/containers/:containerId/items/:itemId`

---

### Badges de statut conteneur — recommandations couleur

| Statut | Couleur suggérée |
|---|---|
| `DRAFT` | gris |
| `BOOKED` | bleu clair |
| `LOADED` | bleu |
| `AT_ORIGIN` | bleu foncé |
| `IN_TRANSIT` | bleu vif |
| `AT_PORT` | cyan |
| `CUSTOMS` | orange |
| `INLAND_TRANSPORT` | violet clair |
| `ARRIVED` | vert clair |
| `DELIVERED` | vert |
| `CLOSED` | gris foncé |

---

## 14. Entrepôts (Warehouses)

Les entrepôts représentent les lieux de stockage intermédiaires : port d'arrivée, entrepôt de transit, magasin, etc. Ils sont partagés à l'échelle de l'entreprise et réutilisables sur plusieurs dossiers.

### Liste — GET `/api/logistics/warehouses`

Query params optionnels : `type`, `isActive`, `search`.

```json
[
  {
    "id": "clx...",
    "name": "Entrepôt Port Lubumbashi",
    "type": "PORT",
    "address": "Avenue du Port 12",
    "city": "Lubumbashi",
    "country": "CD",
    "isActive": true,
    "notes": null,
    "createdAt": "2026-06-01T10:00:00.000Z"
  }
]
```

### Créer — POST `/api/logistics/warehouses`

```json
{
  "name": "Entrepôt Port Lubumbashi",
  "type": "PORT",
  "address": "Avenue du Port 12",
  "city": "Lubumbashi",
  "country": "CD",
  "notes": "Entrepôt principal à quai"
}
```

### Détail — GET `/api/logistics/warehouses/:id`
### Modifier — PUT `/api/logistics/warehouses/:id`

Champs modifiables : `name`, `address`, `city`, `country`, `type`, `isActive`, `notes`.

### Supprimer — DELETE `/api/logistics/warehouses/:id`

Impossible si l'entrepôt est lié à des transferts existants (erreur 409).

---

## 15. Transferts entrepôt (par dossier)

Les transferts tracent les mouvements de marchandises entre entrepôts : Port → Entrepôt de transit → Magasin → Client.

### Liste — GET `/api/logistics/dossiers/:dossierId/transfers`

```json
[
  {
    "id": "clx...",
    "fromWarehouse": { "id": "...", "name": "Port Lubumbashi", "city": "Lubumbashi" },
    "toWarehouse": { "id": "...", "name": "Magasin Central", "city": "Lubumbashi" },
    "transferDate": "2026-08-15T00:00:00.000Z",
    "status": "COMPLETED",
    "notes": null,
    "createdAt": "2026-08-14T09:00:00.000Z"
  }
]
```

### Créer — POST `/api/logistics/dossiers/:dossierId/transfers`

```json
{
  "fromWarehouseId": "clx...",
  "toWarehouseId": "clx...",
  "transferDate": "2026-08-15",
  "status": "PENDING",
  "notes": "Transfert après dédouanement"
}
```

`fromWarehouseId` est optionnel (le départ peut être le port directement).

### Changer le statut — PATCH `/api/logistics/dossiers/:dossierId/transfers/:transferId/status`

```json
{ "status": "COMPLETED" }
```

---

## 16. Flotte — Chauffeurs (Drivers)

### Liste — GET `/api/logistics/fleet/drivers`

Query params optionnels : `isActive`, `search`.

```json
[
  {
    "id": "clx...",
    "firstName": "Jean",
    "lastName": "Kabila",
    "phone": "+243 99 000 0001",
    "licenseNumber": "DL-2026-001",
    "licenseType": "C",
    "isActive": true,
    "vehicles": [
      { "id": "...", "plateNumber": "KA-001-CD", "type": "TRUCK", "status": "AVAILABLE" }
    ]
  }
]
```

### Créer — POST `/api/logistics/fleet/drivers`

```json
{
  "firstName": "Jean",
  "lastName": "Kabila",
  "phone": "+243 99 000 0001",
  "licenseNumber": "DL-2026-001",
  "licenseType": "C",
  "notes": "Chauffeur longue distance"
}
```

### Détail — GET `/api/logistics/fleet/drivers/:id`

Inclut les véhicules liés et les 10 dernières livraisons.

### Modifier — PUT `/api/logistics/fleet/drivers/:id`
### Supprimer — DELETE `/api/logistics/fleet/drivers/:id`

Impossible si le chauffeur a des livraisons enregistrées (erreur 409).

---

## 17. Flotte — Véhicules (Vehicles)

### Liste — GET `/api/logistics/fleet/vehicles`

Query params optionnels : `type`, `status`, `isActive`, `driverId`, `search`.

```json
[
  {
    "id": "clx...",
    "plateNumber": "KA-001-CD",
    "type": "TRUCK",
    "brand": "Isuzu",
    "model": "NQR",
    "year": 2022,
    "capacity": 5000,
    "status": "AVAILABLE",
    "isActive": true,
    "lastLatitude": -11.6635,
    "lastLongitude": 27.4793,
    "lastSeenAt": "2026-06-20T08:00:00.000Z",
    "driver": { "id": "...", "firstName": "Jean", "lastName": "Kabila", "phone": "+243 99 000 0001" }
  }
]
```

### Créer — POST `/api/logistics/fleet/vehicles`

```json
{
  "plateNumber": "KA-001-CD",
  "type": "TRUCK",
  "brand": "Isuzu",
  "model": "NQR",
  "year": 2022,
  "capacity": 5000,
  "driverId": "clx...",
  "notes": "Camion principal"
}
```

### Détail — GET `/api/logistics/fleet/vehicles/:id`

Inclut le chauffeur lié, les 50 dernières positions GPS, et les 10 dernières livraisons.

### Modifier — PUT `/api/logistics/fleet/vehicles/:id`

Champs modifiables : `type`, `brand`, `model`, `year`, `capacity`, `status`, `driverId`, `isActive`, `notes`.

### Supprimer — DELETE `/api/logistics/fleet/vehicles/:id`

Impossible si le véhicule a des livraisons enregistrées (erreur 409).

---

## 18. GPS — Suivi en temps réel

### Envoyer une position — POST `/api/logistics/fleet/vehicles/:id/gps`

Ce endpoint est conçu pour être appelé soit par une application mobile, soit par un webhook Traccar.

```json
{
  "latitude": -11.6635,
  "longitude": 27.4793,
  "speed": 65.5,
  "heading": 180,
  "altitude": 1270,
  "source": "TRACCAR",
  "recordedAt": "2026-06-20T08:30:00.000Z"
}
```

Seuls `latitude` et `longitude` sont obligatoires. Le serveur :
1. Crée une entrée dans `LogisticsGpsPosition`
2. Met à jour `lastLatitude`, `lastLongitude`, `lastSeenAt` sur le véhicule

### Historique des positions — GET `/api/logistics/fleet/vehicles/:id/gps?limit=100`

Retourne les positions triées de la plus récente à la plus ancienne.

```json
[
  {
    "id": "clx...",
    "latitude": -11.6635,
    "longitude": 27.4793,
    "speed": 65.5,
    "heading": 180,
    "altitude": 1270,
    "source": "TRACCAR",
    "recordedAt": "2026-06-20T08:30:00.000Z"
  }
]
```

### Architecture GPS recommandée

```
Téléphone Android
  → Application Traccar Client (gratuit, Play Store)
    → Traccar Server (self-hosted ou cloud)
      → Webhook HTTP POST → /api/logistics/fleet/vehicles/:id/gps
        → Base de données (LogisticsGpsPosition)
          → Frontend (Leaflet + OpenStreetMap)
```

**Carte recommandée :** [Leaflet.js](https://leafletjs.com/) avec tuiles OpenStreetMap. Afficher :
- Marqueur actuel (dernière position `lastLatitude`, `lastLongitude`)
- Polyline traçant l'historique des positions
- Popup avec vitesse, cap, heure de dernière mise à jour

---

## 19. Livraisons (Deliveries)

Les livraisons rattachent un véhicule et un chauffeur à un dossier pour une opération de transport définie.

### Liste — GET `/api/logistics/dossiers/:dossierId/deliveries`

```json
[
  {
    "id": "clx...",
    "origin": "Port de Dar es Salaam",
    "destination": "Lubumbashi",
    "scheduledAt": "2026-08-15T06:00:00.000Z",
    "status": "PLANNED",
    "departedAt": null,
    "arrivedAt": null,
    "fuelCost": null,
    "distanceKm": null,
    "vehicle": { "id": "...", "plateNumber": "KA-001-CD", "type": "TRUCK" },
    "driver": { "id": "...", "firstName": "Jean", "lastName": "Kabila", "phone": "+243 99 000 0001" }
  }
]
```

### Créer — POST `/api/logistics/dossiers/:dossierId/deliveries`

```json
{
  "vehicleId": "clx...",
  "driverId": "clx...",
  "origin": "Port de Dar es Salaam",
  "destination": "Lubumbashi",
  "scheduledAt": "2026-08-15T06:00:00.000Z",
  "notes": "Itinéraire via Nakonde"
}
```

### Modifier — PUT `/api/logistics/dossiers/:dossierId/deliveries/:id`

### Départ — PATCH `/api/logistics/dossiers/:dossierId/deliveries/:id/depart`

Corps vide `{}`. Passe `status → DEPARTED` et renseigne `departedAt` automatiquement.

### Arrivée — PATCH `/api/logistics/dossiers/:dossierId/deliveries/:id/arrive`

Corps vide `{}`. Passe `status → ARRIVED` et renseigne `arrivedAt` automatiquement.

### Supprimer — DELETE `/api/logistics/dossiers/:dossierId/deliveries/:id`

---

## 20. Finance — Taux de change

### Liste — GET `/api/logistics/finance/exchange-rates`

Query params optionnels : `fromCurrency`, `toCurrency`, `isActive`.

```json
[
  {
    "id": "clx...",
    "fromCurrency": "USD",
    "toCurrency": "CDF",
    "rate": 2800.00,
    "source": "BCC",
    "validFrom": "2026-06-01T00:00:00.000Z",
    "validTo": null,
    "isActive": true
  }
]
```

### Créer — POST `/api/logistics/finance/exchange-rates`

```json
{
  "fromCurrency": "USD",
  "toCurrency": "CDF",
  "rate": 2800.00,
  "source": "BCC",
  "validFrom": "2026-06-01",
  "isActive": true
}
```

Si `isActive: true`, le taux précédent actif pour la même paire de devises est automatiquement désactivé.

### Taux actif — GET `/api/logistics/finance/exchange-rates/:from/:to`

Exemple : `GET /api/logistics/finance/exchange-rates/USD/CDF`

Retourne le taux actif le plus récent pour cette paire.

### Convertir — GET `/api/logistics/finance/exchange-rates/convert?amount=1000&from=USD&to=CDF`

```json
{
  "amount": 2800000.00,
  "rate": 2800.00,
  "from": "USD",
  "to": "CDF",
  "rateDate": "2026-06-01T00:00:00.000Z"
}
```

Si `from === to`, retourne `amount` inchangé avec `rate: 1`.

---

## 21. Finance — Assurances

Les assurances sont rattachées à un dossier.

### Liste — GET `/api/logistics/dossiers/:dossierId/insurances`

```json
[
  {
    "id": "clx...",
    "insurer": "Activa Assurances",
    "policyNumber": "POL-2026-001",
    "coverageType": "ALL_RISK",
    "insuredValue": 85000.00,
    "currency": "USD",
    "premium": 850.00,
    "startDate": "2026-07-01T00:00:00.000Z",
    "endDate": "2026-09-30T00:00:00.000Z",
    "status": "ACTIVE",
    "claimAmount": null,
    "notes": null
  }
]
```

### Créer — POST `/api/logistics/dossiers/:dossierId/insurances`

```json
{
  "insurer": "Activa Assurances",
  "policyNumber": "POL-2026-001",
  "coverageType": "ALL_RISK",
  "insuredValue": 85000.00,
  "currency": "USD",
  "premium": 850.00,
  "startDate": "2026-07-01",
  "endDate": "2026-09-30",
  "notes": "Couverture tous risques transport maritime"
}
```

### Modifier — PUT `/api/logistics/dossiers/:dossierId/insurances/:id`

Champs modifiables : tous les champs de création + `status`, `claimAmount`.

---

## 22. Finance — Lettres de crédit

Les lettres de crédit sont rattachées à un dossier.

### Liste — GET `/api/logistics/dossiers/:dossierId/letters-of-credit`

```json
[
  {
    "id": "clx...",
    "lcNumber": "LC-2026-001",
    "type": "DOCUMENTARY_CREDIT",
    "issuingBank": "Rawbank Lubumbashi",
    "beneficiary": "Fournisseur Shanghai SARL",
    "currency": "USD",
    "amount": 85000.00,
    "expiryDate": "2026-09-30T00:00:00.000Z",
    "shipmentDeadline": "2026-08-01T00:00:00.000Z",
    "status": "DRAFT",
    "terms": "Paiement à 90 jours",
    "notes": null
  }
]
```

### Créer — POST `/api/logistics/dossiers/:dossierId/letters-of-credit`

```json
{
  "lcNumber": "LC-2026-001",
  "type": "DOCUMENTARY_CREDIT",
  "issuingBank": "Rawbank Lubumbashi",
  "beneficiary": "Fournisseur Shanghai SARL",
  "currency": "USD",
  "amount": 85000.00,
  "expiryDate": "2026-09-30",
  "shipmentDeadline": "2026-08-01",
  "terms": "Paiement à 90 jours",
  "notes": null
}
```

Le statut initial est toujours `DRAFT`.

### Changer le statut — PATCH `/api/logistics/dossiers/:dossierId/letters-of-credit/:id/status`

```json
{ "status": "ISSUED" }
```

---

## 23. Finance — Garanties bancaires

Les garanties bancaires sont à l'échelle de l'entreprise (optionnellement liées à un dossier).

### Liste — GET `/api/logistics/finance/bank-guarantees`

Query param optionnel : `dossierId`.

```json
[
  {
    "id": "clx...",
    "guaranteeNumber": "BG-2026-001",
    "type": "PERFORMANCE",
    "bank": "Equity Bank",
    "beneficiary": "Ministère des Finances",
    "currency": "USD",
    "amount": 25000.00,
    "expiryDate": "2027-06-30T00:00:00.000Z",
    "status": "ACTIVE",
    "dossierId": "clx...",
    "notes": null
  }
]
```

### Créer — POST `/api/logistics/finance/bank-guarantees`

```json
{
  "guaranteeNumber": "BG-2026-001",
  "type": "PERFORMANCE",
  "bank": "Equity Bank",
  "beneficiary": "Ministère des Finances",
  "currency": "USD",
  "amount": 25000.00,
  "expiryDate": "2027-06-30",
  "dossierId": "clx_optionnel",
  "notes": null
}
```

### Changer le statut — PATCH `/api/logistics/finance/bank-guarantees/:id/status`

```json
{ "status": "RELEASED" }
```

---

## 24. Gestion des erreurs

| Code HTTP | Signification | Action recommandée |
|---|---|---|
| `400` | Données invalides ou transition de statut interdite | Afficher le message d'erreur retourné |
| `401` | JWT manquant ou expiré | Rediriger vers la page de connexion |
| `403` | Permission insuffisante | Masquer l'action (ne pas afficher le bouton) |
| `404` | Ressource introuvable | Afficher un message d'erreur |
| `409` | Conflit (ex. suppression d'un entrepôt lié à des transferts) | Afficher le message d'erreur retourné |

**Format d'erreur standard :**
```json
{
  "success": false,
  "message": "Transition IN_TRANSIT → DRAFT non autorisée"
}
```

### Champs obligatoires par ressource

| Ressource | Champs obligatoires à la création |
|---|---|
| Dossier | aucun (tout est optionnel, `type` et `transportMode` ont des défauts) |
| Item | `description`, `quantity`, `unitValue` |
| Coût | `category`, `amount`, `currency` |
| Document | `name`, `url` |
| Déclaration douanière | `declarationType` |
| Tracking | `location` ou `description` (au moins l'un des deux) |
| Transporteur | `name` |
| Barème douanier | `hsCode`, `description` |
| Conteneur | aucun obligatoire (tous les champs sont optionnels) |
| Entrepôt | `name` |
| Chauffeur | `firstName`, `lastName` |
| Véhicule | `plateNumber` |
| Livraison | `destination` |
| Assurance | `insurer`, `insuredValue`, `premium` |
| Lettre de crédit | `issuingBank`, `beneficiary`, `amount` |
| Garantie bancaire | `bank`, `beneficiary`, `amount` |
| Taux de change | `fromCurrency`, `toCurrency`, `rate` |
| Transfert GPS | `latitude`, `longitude` |

**Exemple d'erreur de validation :**
```json
{
  "success": false,
  "message": "Le champ 'plateNumber' est requis"
}
```

Les erreurs de validation retournent toujours un code `400`. Le champ `message` contient une description lisible, affichable directement à l'utilisateur.

---

## 25. Recommandations UI

### Architecture d'écrans suggérée

```
/logistics
  /dashboard              — KPIs + alertes + carte véhicules
  /dossiers               — Liste des dossiers
  /dossiers/:id           — Détail dossier (onglets)
    /containers           — Gestion des conteneurs
    /deliveries           — Livraisons rattachées
    /transfers            — Transferts entrepôt
    /insurances           — Assurances
    /letters-of-credit    — Lettres de crédit
  /warehouses             — Gestion des entrepôts
  /fleet
    /drivers              — Liste des chauffeurs
    /vehicles             — Liste des véhicules + carte GPS
    /vehicles/:id         — Détail véhicule + historique GPS
  /finance
    /exchange-rates       — Gestion des taux de change
    /bank-guarantees      — Garanties bancaires
```

---

### Page détail d'un dossier — onglets recommandés

1. **Informations** — données générales, transporteur, ports, dates, incoterm
2. **Conteneurs** — liste avec statut individuel + résumé `globalStatus`
3. **Articles** — liste des marchandises
4. **Douane** — déclarations + calcul automatique
5. **Documents** — upload et liste
6. **Frais** — coûts avec résumé par catégorie
7. **Suivi** — timeline chronologique
8. **Livraisons** — véhicules/chauffeurs assignés
9. **Entrepôts** — transferts de marchandises
10. **Finance** — assurances, lettres de crédit

---

### Badges de statut dossier

| Statut | Couleur |
|---|---|
| `DRAFT` | gris |
| `CONFIRMED`, `BOOKING_PLACED`, `GOODS_READY` | bleu |
| `CUSTOMS_EXPORT`, `CUSTOMS_IMPORT` | orange |
| `IN_TRANSIT` | bleu vif |
| `ARRIVED` | vert clair |
| `DELIVERED` | vert |
| `CLOSED` | gris foncé |
| `CANCELLED` | rouge |

---

### Dashboard — section conteneurs

Afficher des compteurs visuels en haut du dashboard :

```
[  24 Total  ] [  8 Arrivés  ] [  10 En transit  ] [  3 En douane  ] [  3 En attente  ]
```

Chaque compteur est cliquable et filtre la liste des dossiers en conséquence.

---

### Carte flotte (page `/fleet/vehicles`)

- Utiliser **Leaflet.js** avec tuiles OpenStreetMap (`https://tile.openstreetmap.org/{z}/{x}/{y}.png`)
- Charger les véhicules actifs via `GET /fleet/vehicles`
- Pour chaque véhicule avec `lastLatitude` + `lastLongitude`, placer un marqueur
- Popup du marqueur : plaque, chauffeur, vitesse, heure `lastSeenAt`
- Rafraîchissement automatique toutes les 30 secondes recommandé

---

### Calcul des taxes douanières

Proposer un bouton "Calculer automatiquement" sur le formulaire de déclaration douanière. Ce bouton appelle `GET /customs/calculate` et pré-remplit les champs `customsDuty`, `vat`, `excise`. L'utilisateur peut ajuster manuellement.

---

### Alertes du dashboard

| Type | Couleur | Description |
|---|---|---|
| ETA dépassée | rouge | Dossier `IN_TRANSIT` dont l'ETA est dépassée |
| Douane en attente | orange | Déclaration `PENDING` depuis plus de X jours |
| Frais impayés > 30 jours | jaune | Frais `isPaid: false` créés il y a plus de 30 jours |

Chaque alerte doit être un lien cliquable qui navigue directement vers le dossier concerné.

---

### Taux de change — intégration UI

- Sur tout formulaire avec un champ `amount` + `currency`, proposer un bouton "Convertir" qui appelle `GET /finance/exchange-rates/convert?amount=X&from=USD&to=CDF`
- Afficher le résultat en dessous du champ : `= 2 800 000 CDF (taux : 2800, au 01/06/2026)`
- Si aucun taux n'est disponible (erreur 404), afficher "Taux non disponible — veuillez configurer le taux de change"
