# Guide d'intégration Frontend — Module RH Pointage
## Option A : Heure fixe globale + Option B : Absences automatiques (Cron)

---

## Table des matières

1. [Vue d'ensemble](#1-vue-densemble)
2. [Option A — Configuration de l'heure d'arrivée](#2-option-a--configuration-de-lheure-darrivée)
3. [Option B — Configuration des absences automatiques](#3-option-b--configuration-des-absences-automatiques)
4. [Déclenchement manuel des absences](#4-déclenchement-manuel-des-absences)
5. [Affichage des absences dans la liste des pointages](#5-affichage-des-absences-dans-la-liste-des-pointages)
6. [Référence complète des endpoints](#6-référence-complète-des-endpoints)
7. [Exemples de code](#7-exemples-de-code)

---

## 1. Vue d'ensemble

Deux fonctionnalités sont disponibles côté backend :

| Fonctionnalité | Description |
|---|---|
| **Option A** | Détection automatique du statut `RETARD` / `PRESENT` lors d'un pointage, basée sur une heure d'arrivée configurée par l'admin |
| **Option B** | Cron job qui génère automatiquement les absences (`ABSENT`) chaque soir à 23h55 pour tous les employés sans pointage |

**Statuts possibles d'un pointage :**

| Statut | Description |
|---|---|
| `PRESENT` | Arrivé à l'heure |
| `RETARD` | Arrivé après l'heure configurée + seuil de tolérance |
| `ABSENT` | Aucun pointage — généré automatiquement par le cron |
| `CONGE` | En congé approuvé (géré par le module congés) |

---

## 2. Option A — Configuration de l'heure d'arrivée

### 2.1 Récupérer la configuration actuelle

```
GET /api/rh/attendance/config
Authorization: Bearer <token>
```

**Réponse :**
```json
{
  "success": true,
  "data": {
    "attendanceExpectedTime": "08:00",
    "attendanceLateThreshold": 5,
    "autoDetectionActive": true
  }
}
```

| Champ | Type | Description |
|---|---|---|
| `attendanceExpectedTime` | `string \| null` | Heure d'arrivée attendue au format `HH:MM`. `null` = détection désactivée |
| `attendanceLateThreshold` | `number` | Délai de grâce en minutes (0 à 120). Ex : `5` = 5 min de tolérance |
| `autoDetectionActive` | `boolean` | `true` si la détection automatique est active |

---

### 2.2 Modifier la configuration

```
PUT /api/rh/attendance/config
Authorization: Bearer <token>
Content-Type: application/json
```

**Corps :**
```json
{
  "attendanceExpectedTime": "08:00",
  "attendanceLateThreshold": 5
}
```

**Pour désactiver la détection automatique :**
```json
{
  "attendanceExpectedTime": null
}
```

**Règles de validation :**
- `attendanceExpectedTime` : format `HH:MM` obligatoire (ex : `08:00`, `07:30`). Accepte `null`.
- `attendanceLateThreshold` : entier entre `0` et `120`.
- Accès réservé aux rôles `ADMIN` et `SUPER_ADMIN`.

**Réponse :**
```json
{
  "success": true,
  "message": "Configuration mise à jour",
  "data": {
    "attendanceExpectedTime": "08:00",
    "attendanceLateThreshold": 5,
    "autoDetectionActive": true
  }
}
```

---

### 2.3 Comportement lors d'un pointage

Quand un employé est pointé via `POST /api/rh/attendance`, si :
- `status` **n'est PAS fourni** dans la requête, ET
- `checkIn` est présent, ET
- `attendanceExpectedTime` est configuré

Alors le backend calcule automatiquement :
- `checkIn` <= heure attendue + seuil → statut `PRESENT`
- `checkIn` > heure attendue + seuil → statut `RETARD`

**Exemple :**
- Heure attendue : `08:00`, seuil : `5 min`
- Employé pointe à `08:04` → `PRESENT`
- Employé pointe à `08:06` → `RETARD`

Pour forcer un statut manuellement, passer `"status": "PRESENT"` (ou autre) dans le corps de la requête.

---

### 2.4 Interface recommandée

```
┌─────────────────────────────────────────────────────┐
│  Configuration du pointage                           │
├─────────────────────────────────────────────────────┤
│  Heure d'arrivée attendue                            │
│  [ 08 ] : [ 00 ]     (input type="time" HH:MM)      │
│                                                       │
│  Délai de tolérance                                   │
│  [ 5 ] minutes                                        │
│                                                       │
│  Détection automatique : ● ACTIVE                     │
│                                                       │
│  [  Enregistrer  ]     [ Désactiver ]                │
└─────────────────────────────────────────────────────┘
```

---

## 3. Option B — Configuration des absences automatiques

### 3.1 Fonctionnement du cron

- **Heure d'exécution :** chaque jour à **23h55** (fuseau `Africa/Kinshasa`)
- Pour chaque entreprise active, le cron :
  1. Vérifie si c'est un jour travaillé (pas week-end, pas férié, pas fermeture)
  2. Liste tous les employés avec le statut `ACTIF`
  3. Exclut ceux qui ont déjà un pointage ce jour
  4. Exclut ceux qui ont un congé `APPROUVE` couvrant ce jour
  5. Crée un enregistrement `ABSENT` pour les restants

---

### 3.2 Récupérer la configuration de l'agenda

```
GET /api/rh/attendance/agenda-config
Authorization: Bearer <token>
```

**Réponse :**
```json
{
  "success": true,
  "data": {
    "weekendDays": [6, 0],
    "publicHolidays": ["2026-06-30", "2026-07-01"],
    "closureDays": ["2026-08-15"]
  }
}
```

| Champ | Type | Description |
|---|---|---|
| `weekendDays` | `number[]` | Jours de week-end. `0`=Dimanche, `1`=Lundi ... `6`=Samedi |
| `publicHolidays` | `string[]` | Jours fériés au format `YYYY-MM-DD` |
| `closureDays` | `string[]` | Fermetures exceptionnelles au format `YYYY-MM-DD` |

---

### 3.3 Modifier la configuration de l'agenda

```
PUT /api/rh/attendance/agenda-config
Authorization: Bearer <token>
Content-Type: application/json
```

**Corps :**
```json
{
  "weekendDays": [6, 0],
  "publicHolidays": ["2026-06-30", "2026-07-01", "2026-12-25"],
  "closureDays": ["2026-08-15"]
}
```

**Règles de validation :**
- `weekendDays` : tableau d'entiers entre `0` et `6`
- `publicHolidays` : tableau de chaînes au format `YYYY-MM-DD`
- `closureDays` : tableau de chaînes au format `YYYY-MM-DD`
- Chaque champ est optionnel — envoyez uniquement ce que vous voulez modifier
- Accès réservé aux rôles `ADMIN` et `SUPER_ADMIN`

**Valeurs par défaut :**
```json
{
  "weekendDays": [6, 0],
  "publicHolidays": [],
  "closureDays": []
}
```

**Réponse :**
```json
{
  "success": true,
  "message": "Configuration agenda mise à jour",
  "data": {
    "weekendDays": [6, 0],
    "publicHolidays": ["2026-06-30"],
    "closureDays": []
  }
}
```

---

### 3.4 Correspondance jour → chiffre

| Chiffre | Jour |
|---|---|
| `0` | Dimanche |
| `1` | Lundi |
| `2` | Mardi |
| `3` | Mercredi |
| `4` | Jeudi |
| `5` | Vendredi |
| `6` | Samedi |

**Configurations courantes :**

| Cas d'usage | weekendDays |
|---|---|
| Samedi + Dimanche | `[6, 0]` |
| Dimanche uniquement | `[0]` |
| Vendredi + Samedi | `[5, 6]` |
| Pas de week-end | `[]` |

---

### 3.5 Interface recommandée

**Section "Jours de week-end" — checkboxes :**

```
Jours non travaillés (week-end) :
[ ] Lundi    [ ] Mardi    [ ] Mercredi    [ ] Jeudi
[ ] Vendredi    [x] Samedi    [x] Dimanche
```

**Section "Jours fériés" — liste dynamique :**

```
Jours fériés :
┌────────────────────────────────────┐
│  30 juin 2026            [ × ]     │
│  1er juillet 2026        [ × ]     │
│  25 décembre 2026        [ × ]     │
│                                     │
│  + Ajouter une date                 │
└────────────────────────────────────┘
```

**Section "Fermetures exceptionnelles" — même UI que les jours fériés.**

---

## 4. Déclenchement manuel des absences

Permet à un admin de générer les absences pour n'importe quelle date sans attendre le cron.

```
POST /api/rh/attendance/generate-absences
Authorization: Bearer <token>
Content-Type: application/json
```

**Corps :**
```json
{
  "date": "2026-07-01"
}
```

`date` est optionnel. Si absent, la date du jour est utilisée.

**Réponse — jour travaillé :**
```json
{
  "success": true,
  "message": "Génération des absences effectuée",
  "data": {
    "skipped": false,
    "date": "2026-07-01",
    "generated": 3,
    "total": 12,
    "presentCount": 8,
    "onLeaveCount": 1
  }
}
```

**Réponse — jour non travaillé (week-end / férié / fermeture) :**
```json
{
  "success": true,
  "message": "Génération des absences effectuée",
  "data": {
    "skipped": true,
    "reason": "Jour non ouvré (week-end, férié ou fermeture)",
    "date": "2026-06-30",
    "generated": 0
  }
}
```

| Champ | Description |
|---|---|
| `skipped` | `true` si le jour est non travaillé — aucune absence créée |
| `reason` | Raison du saut (uniquement si `skipped: true`) |
| `generated` | Nombre d'absences créées |
| `total` | Nombre total d'employés actifs |
| `presentCount` | Employés qui avaient déjà un pointage |
| `onLeaveCount` | Employés en congé approuvé ce jour |

**Interface recommandée :**

```
┌────────────────────────────────────────────────────┐
│  Génération manuelle des absences                   │
│                                                      │
│  Date : [ 2026-07-01 ]   (input type="date")        │
│                                                      │
│  [  Générer les absences  ]                         │
│                                                      │
│  ──────────────────────────────────────────────     │
│  Résultat :                                          │
│  ✓ 3 absence(s) créée(s)                            │
│  · 8 employés présents · 1 en congé                │
└────────────────────────────────────────────────────┘
```

---

## 5. Affichage des absences dans la liste des pointages

Les absences auto apparaissent dans la liste standard des pointages.

```
GET /api/rh/attendance?status=ABSENT&dateFrom=2026-07-01&dateTo=2026-07-31
Authorization: Bearer <token>
```

**Filtres disponibles :**

| Paramètre | Type | Description |
|---|---|---|
| `status` | `string` | `PRESENT`, `RETARD`, `ABSENT`, `CONGE` |
| `employeeId` | `UUID` | Filtrer par employé |
| `dateFrom` | `YYYY-MM-DD` | Date de début |
| `dateTo` | `YYYY-MM-DD` | Date de fin |
| `page` | `number` | Page (défaut : 1) |
| `limit` | `number` | Résultats par page (défaut : 100) |

**Identifier une absence automatique vs manuelle :**

Les absences générées par le cron ont :
- `status: "ABSENT"`
- `checkIn: null` et `checkOut: null`
- `notes: "Absence générée automatiquement (cron)"`
- `recordedBy: null`

Les absences déclenchées manuellement par un admin ont :
- `notes: "Absence générée automatiquement (manuel:<userId>)"`

Vous pouvez utiliser le champ `notes` pour afficher un badge "Auto" ou "Admin" dans l'interface.

---

## 6. Référence complète des endpoints

### Option A — Heure fixe

| Méthode | URL | Accès | Description |
|---|---|---|---|
| `GET` | `/api/rh/attendance/config` | `view_attendance` | Lire la config horaire |
| `PUT` | `/api/rh/attendance/config` | `ADMIN / SUPER_ADMIN` | Modifier l'heure attendue et le seuil |

### Option B — Absences automatiques

| Méthode | URL | Accès | Description |
|---|---|---|---|
| `GET` | `/api/rh/attendance/agenda-config` | `view_attendance` | Lire la config agenda |
| `PUT` | `/api/rh/attendance/agenda-config` | `ADMIN / SUPER_ADMIN` | Modifier week-ends, fériés, fermetures |
| `POST` | `/api/rh/attendance/generate-absences` | `ADMIN / SUPER_ADMIN` | Déclencher manuellement |

### Pointages (existants)

| Méthode | URL | Accès | Description |
|---|---|---|---|
| `GET` | `/api/rh/attendance` | `view_attendance` | Liste avec filtres |
| `GET` | `/api/rh/attendance/:id` | `view_attendance` | Un pointage |
| `POST` | `/api/rh/attendance` | `record_attendance` | Créer un pointage |
| `POST` | `/api/rh/attendance/bulk` | `record_attendance` | Pointage en masse |
| `PUT` | `/api/rh/attendance/:id` | `edit_attendance` | Modifier un pointage |
| `GET` | `/api/rh/attendance/employees/:employeeId/summary` | `view_attendance` | Résumé mensuel |

---

## 7. Exemples de code

### 7.1 Charger les deux configurations au montage du composant

```javascript
async function loadAttendanceSettings(token) {
  const [configRes, agendaRes] = await Promise.all([
    fetch('/api/rh/attendance/config', {
      headers: { Authorization: `Bearer ${token}` },
    }),
    fetch('/api/rh/attendance/agenda-config', {
      headers: { Authorization: `Bearer ${token}` },
    }),
  ]);

  const { data: config } = await configRes.json();
  const { data: agenda } = await agendaRes.json();

  return { config, agenda };
}
```

---

### 7.2 Sauvegarder les deux configurations (Option A + B)

```javascript
async function saveAttendanceSettings(token, form) {
  // Option A
  const configRes = await fetch('/api/rh/attendance/config', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      attendanceExpectedTime: form.expectedTime || null,
      attendanceLateThreshold: form.lateThreshold,
    }),
  });

  // Option B
  const agendaRes = await fetch('/api/rh/attendance/agenda-config', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      weekendDays: form.weekendDays,        // ex : [6, 0]
      publicHolidays: form.publicHolidays,  // ex : ["2026-06-30"]
      closureDays: form.closureDays,        // ex : []
    }),
  });

  return {
    config: (await configRes.json()).data,
    agenda: (await agendaRes.json()).data,
  };
}
```

---

### 7.3 Déclencher la génération manuelle des absences

```javascript
async function generateAbsences(token, date) {
  const res = await fetch('/api/rh/attendance/generate-absences', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ date }), // ex : "2026-07-01"
  });

  const { data } = await res.json();

  if (data.skipped) {
    alert(`Jour non travaillé — ${data.reason}`);
  } else {
    alert(`${data.generated} absence(s) créée(s) sur ${data.total} employés actifs.`);
  }
}
```

---

### 7.4 Constante des jours de la semaine (pour les checkboxes)

```javascript
const WEEK_DAYS = [
  { value: 1, label: 'Lundi' },
  { value: 2, label: 'Mardi' },
  { value: 3, label: 'Mercredi' },
  { value: 4, label: 'Jeudi' },
  { value: 5, label: 'Vendredi' },
  { value: 6, label: 'Samedi' },
  { value: 0, label: 'Dimanche' },
];
```

---

### 7.5 Déterminer l'origine d'une absence

```javascript
function getAbsenceOrigin(record) {
  if (record.status !== 'ABSENT') return null;
  if (!record.notes) return 'manuel';
  if (record.notes.includes('(cron)')) return 'automatique';
  if (record.notes.includes('(manuel:')) return 'admin';
  return 'manuel';
}

// Utilisation dans le rendu :
// getAbsenceOrigin(record) === 'automatique' => badge "Auto"
// getAbsenceOrigin(record) === 'admin'       => badge "Admin"
```

---

### 7.6 Couleurs de badge recommandées par statut

```css
.badge-PRESENT { background: #16a34a; color: #fff; }  /* vert   */
.badge-RETARD  { background: #d97706; color: #fff; }  /* orange */
.badge-ABSENT  { background: #dc2626; color: #fff; }  /* rouge  */
.badge-CONGE   { background: #2563eb; color: #fff; }  /* bleu   */
```

---

## Notes importantes

1. **Ordre des routes :** Les routes `/config`, `/agenda-config` et `/generate-absences` sont déclarées AVANT la route paramétrée `/:id` — aucun conflit possible côté backend.

2. **Pas de doublon :** Le cron et la génération manuelle utilisent `skipDuplicates: true`. Relancer deux fois la génération pour une même date ne crée pas de doublons.

3. **Correction d'une absence auto :** Une absence générée automatiquement peut être corrigée via `PUT /api/rh/attendance/:id` (ex : changer le statut en `PRESENT` si le pointage avait été oublié). Affichez un bouton "Corriger" lorsque `notes` contient `"Absence générée automatiquement"`.

4. **Résumé mensuel :** Le endpoint `GET /api/rh/attendance/employees/:employeeId/summary` retourne déjà un objet `parStatut` qui inclut le comptage des `ABSENT`. Il peut être affiché directement dans le profil employé.

5. **Fuseau horaire :** Le cron tourne en `Africa/Kinshasa`. Si le serveur est déployé dans un autre fuseau, adapter la valeur `timezone` dans `src/core/absence.cron.js`.
