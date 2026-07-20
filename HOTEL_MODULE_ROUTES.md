# Module Hôtellerie — Documentation des Routes API

**Base URL:** `http://localhost:3000/api/hotel`  
**Authentification:** Bearer Token JWT requis sur toutes les routes  
**Module requis:** `hotel` (abonnement PREMIUM ou ENTERPRISE)

---

## Table des Matières

1. [Types de Chambres](#1-types-de-chambres)
2. [Chambres](#2-chambres)
3. [Plans Tarifaires](#3-plans-tarifaires)
4. [Réservations](#4-réservations)
5. [Séjours](#5-séjours)
6. [Housekeeping](#6-housekeeping)
7. [Facturation](#7-facturation)
8. [Dashboard & Rapports](#8-dashboard--rapports)
9. [Permissions par Rôle](#9-permissions-par-rôle)
10. [Enums & Constantes](#10-enums--constantes)
11. [Règles Métier](#11-règles-métier)

---

## 1. Types de Chambres

> Préfixe: `/api/hotel/room-types`

| Méthode | Endpoint | Permission | Description |
|---------|----------|------------|-------------|
| `GET` | `/room-types` | `hotel:view_rooms` | Lister tous les types de chambres |
| `GET` | `/room-types/:id` | `hotel:view_rooms` | Détails d'un type de chambre |
| `POST` | `/room-types` | `hotel:manage_rooms` | Créer un type de chambre |
| `PUT` | `/room-types/:id` | `hotel:manage_rooms` | Modifier un type de chambre |
| `DELETE` | `/room-types/:id` | `hotel:manage_rooms` | Supprimer un type de chambre (échoue s'il a des chambres actives) |

### POST /room-types — Corps de la requête

```json
{
  "name": "Chambre Standard",
  "description": "Chambre confortable avec vue sur jardin",
  "basePrice": 85000,
  "maxOccupancy": 2,
  "bedType": "DOUBLE",
  "amenities": ["wifi", "climatisation", "tv"],
  "sortOrder": 1
}
```

| Champ | Type | Requis | Contraintes |
|-------|------|--------|-------------|
| `name` | string | Oui | max 100 caractères, unique par société |
| `basePrice` | float | Oui | >= 0 |
| `maxOccupancy` | int | Non | 1–50, défaut: 2 |
| `bedType` | string | Non | `SIMPLE`, `DOUBLE`, `TWIN`, `KING`, `QUEEN` |
| `description` | string | Non | max 1000 caractères |
| `amenities` | array | Non | Liste des équipements |
| `sortOrder` | int | Non | Ordre d'affichage |

### PUT /room-types/:id — Corps de la requête

Tous les champs sont optionnels. Même structure que le POST avec en plus :

```json
{
  "isActive": false
}
```

---

## 2. Chambres

> Préfixe: `/api/hotel/rooms`

| Méthode | Endpoint | Permission | Description |
|---------|----------|------------|-------------|
| `GET` | `/rooms/overview` | `hotel:view_rooms` | Vue d'ensemble + compteurs par statut |
| `GET` | `/rooms/availability` | `hotel:view_rooms` | Chambres disponibles pour une période |
| `GET` | `/rooms` | `hotel:view_rooms` | Lister les chambres (paginé, filtrable) |
| `GET` | `/rooms/:id` | `hotel:view_rooms` | Détails d'une chambre |
| `POST` | `/rooms` | `hotel:manage_rooms` | Créer une chambre |
| `PUT` | `/rooms/:id` | `hotel:manage_rooms` | Modifier une chambre |
| `PATCH` | `/rooms/:id/status` | `hotel:manage_rooms` | Changer le statut manuellement |
| `PATCH` | `/rooms/:id/block` | `hotel:manage_rooms` | Bloquer / débloquer une chambre |

### GET /rooms — Paramètres de filtre

| Paramètre | Type | Description |
|-----------|------|-------------|
| `status` | string | `LIBRE`, `RESERVEE`, `OCCUPEE`, `EN_MENAGE`, `HORS_SERVICE` |
| `housekeepingStatus` | string | `PROPRE`, `SALE`, `EN_COURS` |
| `floor` | int | Numéro d'étage |
| `roomTypeId` | UUID | Filtrer par type |
| `isActive` | boolean | Actif/inactif |
| `page` | int | Numéro de page (défaut: 1) |
| `limit` | int | Éléments par page (défaut: 100) |

### GET /rooms/availability — Paramètres

| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| `checkIn` | date | Oui | Date d'arrivée (YYYY-MM-DD) |
| `checkOut` | date | Oui | Date de départ (YYYY-MM-DD) |
| `roomTypeId` | UUID | Non | Filtrer par type de chambre |
| `adults` | int | Non | Nombre d'adultes |

### POST /rooms — Corps de la requête

```json
{
  "roomTypeId": "uuid-du-type",
  "number": "101",
  "name": "Chambre Lilas",
  "floor": 1
}
```

| Champ | Type | Requis | Contraintes |
|-------|------|--------|-------------|
| `roomTypeId` | UUID | Oui | Type de chambre existant |
| `number` | string | Oui | max 20 caractères, unique par société |
| `name` | string | Non | max 100 caractères |
| `floor` | int | Non | 0–100, défaut: 1 |

### PATCH /rooms/:id/status — Corps de la requête

```json
{
  "status": "EN_MENAGE"
}
```

Valeurs acceptées: `LIBRE`, `RESERVEE`, `OCCUPEE`, `EN_MENAGE`, `HORS_SERVICE`

> **Note:** Le changement de statut via check-in/out et inspection housekeeping est automatique. Cette route permet une modification manuelle par un manager.

### PATCH /rooms/:id/block — Corps de la requête

```json
{
  "isBlocked": true,
  "blockedReason": "Travaux de rénovation salle de bain",
  "blockedUntil": "2026-07-15"
}
```

> **Règle métier:** Bloquer une chambre (`isBlocked: true`) passe automatiquement son statut à `HORS_SERVICE`. La débloquer (`isBlocked: false`) la remet à `LIBRE`. Une chambre avec un séjour actif ne peut pas être bloquée.

---

## 3. Plans Tarifaires

> Préfixe: `/api/hotel/rates`

| Méthode | Endpoint | Permission | Description |
|---------|----------|------------|-------------|
| `GET` | `/rates/calculate` | `hotel:view_rooms` | Calculer le prix pour une période |
| `GET` | `/rates` | `hotel:manage_rates` | Lister les plans tarifaires |
| `GET` | `/rates/:id` | `hotel:manage_rates` | Détails d'un plan tarifaire |
| `POST` | `/rates` | `hotel:manage_rates` | Créer un plan tarifaire |
| `PUT` | `/rates/:id` | `hotel:manage_rates` | Modifier un plan tarifaire |
| `DELETE` | `/rates/:id` | `hotel:manage_rates` | Supprimer un plan tarifaire |

### GET /rates/calculate — Paramètres

| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| `roomTypeId` | UUID | Oui | Type de chambre |
| `checkIn` | date | Oui | Date d'arrivée |
| `checkOut` | date | Oui | Date de départ |

**Réponse:**
```json
{
  "nights": 3,
  "pricePerNight": 85000,
  "totalAmount": 265000,
  "breakdown": [
    { "date": "2026-07-04", "price": 85000, "planName": "Tarif Standard" },
    { "date": "2026-07-05", "price": 95000, "planName": "Tarif Week-end" },
    { "date": "2026-07-06", "price": 85000, "planName": "Tarif Standard" }
  ]
}
```

> **Logique de priorité:** Le système évalue les plans tarifaires du plus prioritaire au moins prioritaire. Le premier plan applicable à la date (en tenant compte des jours de la semaine, des dates de validité et de la durée de séjour) est retenu. En l'absence de plan, le `basePrice` du type de chambre est utilisé.

### POST /rates — Corps de la requête

```json
{
  "roomTypeId": "uuid-du-type",
  "name": "Tarif Week-end",
  "pricePerNight": 95000,
  "startDate": "2026-01-01",
  "endDate": "2026-12-31",
  "daysOfWeek": [5, 6],
  "minNights": 2,
  "maxNights": 7,
  "priority": 10
}
```

| Champ | Type | Requis | Description |
|-------|------|--------|-------------|
| `roomTypeId` | UUID | Oui | Type de chambre concerné |
| `name` | string | Oui | max 100 caractères |
| `pricePerNight` | float | Oui | Prix par nuit |
| `startDate` | date | Non | Début de validité (null = sans limite) |
| `endDate` | date | Non | Fin de validité (null = sans limite) |
| `daysOfWeek` | int[] | Non | Jours applicables (0=dim, 1=lun...6=sam). Vide = tous les jours |
| `minNights` | int | Non | Séjour minimum pour l'application du tarif (défaut: 1) |
| `maxNights` | int | Non | Séjour maximum |
| `priority` | int | Non | Priorité (plus élevé = prioritaire, défaut: 0) |

---

## 4. Réservations

> Préfixe: `/api/hotel/bookings`

| Méthode | Endpoint | Permission | Description |
|---------|----------|------------|-------------|
| `GET` | `/bookings/calendar` | `hotel:view_bookings` | Vue calendrier des réservations |
| `GET` | `/bookings` | `hotel:view_bookings` | Lister les réservations (paginé) |
| `GET` | `/bookings/:id` | `hotel:view_bookings` | Détails complets (avec séjour, facture) |
| `POST` | `/bookings` | `hotel:create_booking` | Créer une réservation |
| `PUT` | `/bookings/:id` | `hotel:manage_bookings` | Modifier une réservation |
| `POST` | `/bookings/:id/confirm` | `hotel:manage_bookings` | Confirmer (EN_ATTENTE → CONFIRMEE) |
| `POST` | `/bookings/:id/cancel` | `hotel:manage_bookings` | Annuler |
| `POST` | `/bookings/:id/no-show` | `hotel:manage_bookings` | Marquer comme no-show |
| `POST` | `/bookings/:bookingId/checkin` | `hotel:checkin` | Effectuer le check-in |
| `POST` | `/bookings/:bookingId/checkout` | `hotel:checkout` | Effectuer le check-out |
| `POST` | `/bookings/:bookingId/extend` | `hotel:manage_stays` | Prolonger le séjour |
| `GET` | `/bookings/:id/guests` | `hotel:view_bookings` | Lister les accompagnants |
| `POST` | `/bookings/:id/guests` | `hotel:manage_bookings` | Ajouter un accompagnant |
| `DELETE` | `/bookings/:id/guests/:guestId` | `hotel:manage_bookings` | Supprimer un accompagnant |
| `GET` | `/bookings/:bookingId/bill` | `hotel:view_billing` | Voir la facture (alias de `/bills`) |
| `POST` | `/bookings/:bookingId/bill` | `hotel:manage_billing` | Générer la facture depuis la réservation |

> **Note sur les routes /bill:** Ces deux routes (`GET` et `POST`) sont des **alias de commodité** — elles évitent de devoir connaître l'ID de la facture quand on travaille à partir d'une réservation. Elles renvoient exactement les mêmes données que `/bills/:id`.

### GET /bookings — Paramètres de filtre

| Paramètre | Type | Description |
|-----------|------|-------------|
| `status` | string | `EN_ATTENTE`, `CONFIRMEE`, `CHECKED_IN`, `CHECKED_OUT`, `ANNULEE`, `NO_SHOW` |
| `roomId` | UUID | Filtrer par chambre |
| `startDate` | date | checkInDate >= |
| `endDate` | date | checkInDate <= |
| `search` | string | Recherche sur nom, email, téléphone, numéro de réservation |
| `page` | int | Page (défaut: 1) |
| `limit` | int | Éléments par page (défaut: 50) |

### GET /bookings/calendar — Paramètres

| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| `startDate` | date | Oui | Début de la période |
| `endDate` | date | Oui | Fin de la période |

### POST /bookings — Corps de la requête

```json
{
  "roomId": "uuid-de-la-chambre",
  "guestName": "Jean Dupont",
  "guestPhone": "+225 07 12 34 56 78",
  "guestEmail": "jean.dupont@email.com",
  "guestIdNumber": "CI-123456",
  "checkInDate": "2026-07-10",
  "checkOutDate": "2026-07-13",
  "adults": 2,
  "children": 1,
  "depositAmount": 85000,
  "source": "DIRECT",
  "notes": "Client habituel",
  "specialRequests": "Chambre non-fumeur, lit bébé",
  "guests": [
    {
      "firstName": "Marie",
      "lastName": "Dupont",
      "idNumber": "CI-789012",
      "nationality": "Ivoirienne"
    }
  ]
}
```

| Champ | Type | Requis | Contraintes |
|-------|------|--------|-------------|
| `roomId` | UUID | Oui | Chambre disponible et non bloquée |
| `guestName` | string | Oui | max 100 caractères |
| `guestPhone` | string | Oui | max 30 caractères |
| `guestEmail` | string | Non | Format email valide |
| `guestIdNumber` | string | Non | Numéro de pièce d'identité |
| `checkInDate` | date | Oui | YYYY-MM-DD |
| `checkOutDate` | date | Oui | YYYY-MM-DD, > checkInDate |
| `adults` | int | Non | 1–20, défaut: 1 |
| `children` | int | Non | 0–20, défaut: 0 |
| `pricePerNight` | float | Non | Auto-calculé via plans tarifaires si absent |
| `totalAmount` | float | Non | Auto-calculé si absent |
| `depositAmount` | float | Non | Acompte versé à la réservation |
| `source` | string | Non | `DIRECT`, `PHONE`, `ONLINE`, `AGENCE` |
| `guests` | array | Non | Accompagnants supplémentaires |

### POST /bookings/:id/cancel — Corps de la requête

```json
{
  "reason": "Annulation par le client pour raison personnelle"
}
```

### POST /bookings/:bookingId/checkin — Corps de la requête

```json
{
  "keyGiven": true,
  "keyNumber": "A-101",
  "notes": "Client arrivé à 14h30"
}
```

> **Effet automatique:** Le statut de la chambre passe à `OCCUPEE` et la réservation passe à `CHECKED_IN`.

### POST /bookings/:bookingId/checkout — Corps de la requête

```json
{
  "notes": "Départ à 11h00, chambre en bon état"
}
```

> **Effet automatique:** Le statut de la chambre passe à `EN_MENAGE`, son `housekeepingStatus` passe à `SALE`, la réservation passe à `CHECKED_OUT`, et une tâche `NETTOYAGE_COMPLET` de priorité `HAUTE` est automatiquement créée.

### POST /bookings/:bookingId/extend — Corps de la requête

```json
{
  "newCheckOutDate": "2026-07-16"
}
```

La nouvelle date doit être postérieure à la date de départ actuelle. La chambre doit être disponible pour la période d'extension.

### POST /bookings/:id/guests — Corps de la requête

```json
{
  "firstName": "Marie",
  "lastName": "Dupont",
  "idType": "CNI",
  "idNumber": "CI-789012",
  "nationality": "Ivoirienne",
  "dateOfBirth": "1990-05-15"
}
```

---

## 5. Séjours

> Préfixe: `/api/hotel/stays`

| Méthode | Endpoint | Permission | Description |
|---------|----------|------------|-------------|
| `GET` | `/stays/active` | `hotel:view_stays` | Tous les séjours en cours |
| `GET` | `/stays/:id` | `hotel:view_stays` | Détails d'un séjour |
| `GET` | `/stays/:id/services` | `hotel:view_stays` | Services consommés du séjour |
| `POST` | `/stays/:id/services` | `hotel:add_service` | Ajouter un service au séjour |
| `DELETE` | `/stays/:stayId/services/:serviceId` | `hotel:manage_stays` | Supprimer un service non encore facturé |

> **Note:** Un séjour est créé automatiquement lors du check-in. Il n'y a pas de route de création directe.

### POST /stays/:id/services — Corps de la requête

```json
{
  "category": "ROOM_SERVICE",
  "description": "Petit-déjeuner en chambre",
  "quantity": 2,
  "unitPrice": 8500,
  "productId": "uuid-optionnel",
  "notes": "Commande passée à 8h00"
}
```

| Champ | Type | Requis | Contraintes |
|-------|------|--------|-------------|
| `description` | string | Oui | max 500 caractères |
| `unitPrice` | float | Oui | >= 0 |
| `category` | string | Non | `ROOM_SERVICE`, `MINIBAR`, `LAVERIE`, `TRANSPORT`, `TELEPHONE`, `AUTRE` |
| `quantity` | float | Non | >= 0.01, défaut: 1 |
| `productId` | UUID | Non | Référence produit interne |
| `notes` | string | Non | max 500 caractères |

> Un service déjà facturé (`isBilled: true`) ne peut pas être supprimé.

---

## 6. Housekeeping

> Préfixe: `/api/hotel/housekeeping`

| Méthode | Endpoint | Permission | Description |
|---------|----------|------------|-------------|
| `GET` | `/housekeeping/dashboard` | `hotel:view_housekeeping` | Tableau de bord housekeeping |
| `GET` | `/housekeeping` | `hotel:view_housekeeping` | Lister les tâches (filtrable) |
| `GET` | `/housekeeping/:id` | `hotel:view_housekeeping` | Détails d'une tâche |
| `POST` | `/housekeeping` | `hotel:manage_housekeeping` | Créer une tâche manuellement |
| `PATCH` | `/housekeeping/:id/assign` | `hotel:manage_housekeeping` | Assigner à un agent |
| `PATCH` | `/housekeeping/:id/start` | `hotel:housekeeping_agent` | Démarrer |
| `PATCH` | `/housekeeping/:id/complete` | `hotel:housekeeping_agent` | Marquer comme terminée |
| `PATCH` | `/housekeeping/:id/inspect` | `hotel:inspect_housekeeping` | Inspecter (valider ou refuser) |
| `PATCH` | `/housekeeping/:id/reject` | `hotel:inspect_housekeeping` | Rejeter avec motif |

> **Cycle de vie automatique:** À chaque checkout, une tâche `NETTOYAGE_COMPLET` de priorité `HAUTE` est créée automatiquement. Lorsqu'une tâche est inspectée et approuvée (`passed: true`), la chambre repasse automatiquement à `LIBRE` (ou `RESERVEE` si une réservation future existe) avec `housekeepingStatus: PROPRE`.

### GET /housekeeping — Paramètres de filtre

| Paramètre | Type | Description |
|-----------|------|-------------|
| `status` | string | `EN_ATTENTE`, `ASSIGNEE`, `EN_COURS`, `TERMINEE`, `INSPECTEE`, `REFUSEE` |
| `type` | string | `NETTOYAGE_COMPLET`, `NETTOYAGE_RECOUCHE`, `INSPECTION`, `MAINTENANCE`, `DESINFECTION` |
| `priority` | string | `URGENTE`, `HAUTE`, `NORMALE` |
| `assignedTo` | UUID | ID de l'agent assigné |
| `roomId` | UUID | ID de la chambre |
| `page` | int | Page (défaut: 1) |
| `limit` | int | Éléments par page (défaut: 50) |

### POST /housekeeping — Corps de la requête

```json
{
  "roomId": "uuid-de-la-chambre",
  "type": "NETTOYAGE_COMPLET",
  "priority": "HAUTE",
  "assignedTo": "uuid-de-l-agent",
  "scheduledAt": "2026-07-13T09:00:00Z",
  "notes": "Départ prévu à 11h00"
}
```

### PATCH /housekeeping/:id/assign — Corps de la requête

```json
{
  "assignedTo": "uuid-de-l-agent"
}
```

### PATCH /housekeeping/:id/complete — Corps de la requête

```json
{
  "notes": "Chambre nettoyée, literie changée, salle de bain désinfectée"
}
```

### PATCH /housekeeping/:id/inspect — Corps de la requête

```json
{
  "passed": true,
  "notes": "Chambre conforme aux standards"
}
```

### PATCH /housekeeping/:id/reject — Corps de la requête

```json
{
  "notes": "Salle de bain non nettoyée, rideaux non changés"
}
```

---

## 7. Facturation

> Préfixe: `/api/hotel/bills`

| Méthode | Endpoint | Permission | Description |
|---------|----------|------------|-------------|
| `GET` | `/bills` | `hotel:view_billing` | Lister toutes les factures |
| `GET` | `/bills/:id` | `hotel:view_billing` | Détails complets d'une facture |
| `POST` | `/bills/:id/items` | `hotel:manage_billing` | Ajouter un article à la facture |
| `POST` | `/bills/:id/payments` | `hotel:process_payment` | Enregistrer un paiement |
| `DELETE` | `/bills/:id/payments/:paymentId` | `hotel:manage_billing` | Annuler un paiement |

> **Génération de facture:** La facture se crée via `POST /bookings/:bookingId/bill`. Cette route est un alias de commodité lié à la réservation. Une fois créée, la facture est accessible via `GET /bills/:id` ou `GET /bookings/:bookingId/bill`.

> **Annulation de paiement:** Seuls les paiements sur des factures non clôturées (`status != PAYEE`) peuvent être annulés. L'annulation recalcule automatiquement `amountPaid`, `balanceDue` et `status`.

### GET /bills — Paramètres de filtre

| Paramètre | Type | Description |
|-----------|------|-------------|
| `status` | string | `OUVERTE`, `PARTIELLEMENT_PAYEE`, `PAYEE`, `ANNULEE` |
| `page` | int | Page (défaut: 1) |
| `limit` | int | Éléments par page (défaut: 50) |

### POST /bills/:id/items — Corps de la requête

```json
{
  "type": "SERVICE",
  "description": "Blanchisserie",
  "quantity": 1,
  "unitPrice": 15000
}
```

### POST /bills/:id/payments — Corps de la requête

```json
{
  "amount": 85000,
  "method": "CARD",
  "reference": "TXN-2026-001",
  "notes": "Paiement par carte Visa"
}
```

| Champ | Type | Requis | Contraintes |
|-------|------|--------|-------------|
| `amount` | float | Oui | > 0, <= `balanceDue` |
| `method` | string | Non | `CASH`, `CARD`, `MOBILE_MONEY`, `BANK_TRANSFER` (défaut: `CASH`) |
| `reference` | string | Non | Référence de transaction |
| `notes` | string | Non | Commentaire |

---

## 8. Dashboard & Rapports

> Préfixe: `/api/hotel/dashboard`

| Méthode | Endpoint | Permission | Description |
|---------|----------|------------|-------------|
| `GET` | `/dashboard` | `hotel:view_dashboard` | Vue d'ensemble en temps réel |
| `GET` | `/dashboard/arrivals` | `hotel:view_dashboard` | Arrivées du jour (ou d'une date) |
| `GET` | `/dashboard/departures` | `hotel:view_dashboard` | Départs du jour (ou d'une date) |
| `GET` | `/dashboard/reports/occupancy` | `hotel:view_reports` | Rapport de taux d'occupation |
| `GET` | `/dashboard/reports/revenue` | `hotel:view_reports` | Rapport de revenus |

### GET /dashboard — Exemple de réponse

```json
{
  "rooms": {
    "total": 20,
    "LIBRE": 8,
    "RESERVEE": 3,
    "OCCUPEE": 7,
    "EN_MENAGE": 2,
    "HORS_SERVICE": 0,
    "occupancyRate": 35.0
  },
  "today": {
    "checkins": 3,
    "checkouts": 2,
    "activeStays": 7
  },
  "housekeeping": { "pendingTasks": 4 },
  "revenue": { "month": 2550000 }
}
```

### GET /dashboard/arrivals et /departures — Paramètres

| Paramètre | Type | Description |
|-----------|------|-------------|
| `date` | date | Date cible (défaut: aujourd'hui) |

### GET /dashboard/reports/occupancy et /revenue — Paramètres

| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| `startDate` | date | Oui | Début de période |
| `endDate` | date | Oui | Fin de période |

---

## 9. Permissions par Rôle

| Permission | ADMIN | SUPERVISOR | HOTEL_MANAGER | RECEPTIONNISTE | GOUVERNANTE |
|------------|:-----:|:----------:|:-------------:|:--------------:|:-----------:|
| `view_rooms` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `manage_rooms` | ✅ | ✅ | ✅ | — | — |
| `view_bookings` | ✅ | ✅ | ✅ | ✅ | — |
| `create_booking` | ✅ | ✅ | ✅ | ✅ | — |
| `manage_bookings` | ✅ | ✅ | ✅ | ✅ | — |
| `checkin` | ✅ | ✅ | ✅ | ✅ | — |
| `checkout` | ✅ | ✅ | ✅ | ✅ | — |
| `manage_stays` | ✅ | ✅ | ✅ | ✅ | — |
| `view_stays` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `add_service` | ✅ | ✅ | ✅ | ✅ | — |
| `view_housekeeping` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `manage_housekeeping` | ✅ | ✅ | ✅ | — | ✅ |
| `housekeeping_agent` | ✅ | — | ✅ | — | ✅ |
| `inspect_housekeeping` | ✅ | ✅ | ✅ | — | ✅ |
| `manage_rates` | ✅ | ✅ | ✅ | — | — |
| `view_billing` | ✅ | ✅ | ✅ | ✅ | — |
| `process_payment` | ✅ | ✅ | ✅ | ✅ | — |
| `manage_billing` | ✅ | ✅ | ✅ | ✅ | — |
| `view_dashboard` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `view_reports` | ✅ | ✅ | ✅ | — | — |
| `export_data` | ✅ | ✅ | ✅ | — | — |

> **SUPER_ADMIN** a accès à toutes les permissions.
>
> **OPERATOR** et **CASHIER** n'ont pas de permissions hôtel — ces rôles sont conçus pour le module magasin/restaurant. Pour le personnel hôtelier, utiliser **RECEPTIONNISTE**, **GOUVERNANTE** ou **HOTEL_MANAGER**.

---

## 10. Enums & Constantes

### Statuts de chambre (`HotelRoomStatus`)

| Valeur | Description | Transition automatique |
|--------|-------------|----------------------|
| `LIBRE` | Chambre disponible et propre | Après inspection approuvée |
| `RESERVEE` | Réservée, client non arrivé | Après inspection si réservation future |
| `OCCUPEE` | Client en séjour | Après check-in |
| `EN_MENAGE` | En cours de nettoyage | Après check-out |
| `HORS_SERVICE` | Indisponible | Après blocage manuel |

### Statuts housekeeping chambre (`HotelHousekeepingStatus`)

| Valeur | Description |
|--------|-------------|
| `PROPRE` | Chambre propre (après inspection) |
| `SALE` | Nécessite nettoyage (après checkout) |
| `EN_COURS` | Nettoyage en cours |

### Statuts de réservation (`HotelBookingStatus`)

| Valeur | Description |
|--------|-------------|
| `EN_ATTENTE` | Réservation non confirmée |
| `CONFIRMEE` | Réservation confirmée |
| `CHECKED_IN` | Client arrivé |
| `CHECKED_OUT` | Client parti |
| `ANNULEE` | Annulée |
| `NO_SHOW` | Client non présenté |

### Statuts de séjour (`HotelStayStatus`)

| Valeur | Description |
|--------|-------------|
| `ACTIF` | Séjour en cours |
| `CLOTURE` | Séjour terminé |
| `INCIDENT` | Incident signalé |

### Types de tâches housekeeping (`HotelHousekeepingType`)

| Valeur | Description |
|--------|-------------|
| `NETTOYAGE_COMPLET` | Nettoyage complet (départ) |
| `NETTOYAGE_RECOUCHE` | Nettoyage recouche (client présent) |
| `INSPECTION` | Inspection qualité |
| `MAINTENANCE` | Travaux de maintenance |
| `DESINFECTION` | Désinfection |

### Statuts de tâche housekeeping (`HotelHousekeepingTaskStatus`)

| Valeur | Description |
|--------|-------------|
| `EN_ATTENTE` | Créée, non assignée |
| `ASSIGNEE` | Assignée à un agent |
| `EN_COURS` | En cours d'exécution |
| `TERMINEE` | Terminée, en attente d'inspection |
| `INSPECTEE` | Inspectée et approuvée |
| `REFUSEE` | Rejetée lors de l'inspection |

### Statuts de facture (`HotelBillStatus`)

| Valeur | Description |
|--------|-------------|
| `OUVERTE` | Facture ouverte |
| `PARTIELLEMENT_PAYEE` | Paiement partiel |
| `PAYEE` | Entièrement réglée |
| `ANNULEE` | Facture annulée |

### Types de lit (`bedType`)

`SIMPLE` · `DOUBLE` · `TWIN` · `KING` · `QUEEN`

### Sources de réservation (`source`)

`DIRECT` · `PHONE` · `ONLINE` · `AGENCE`

### Catégories de services séjour (`category`)

`ROOM_SERVICE` · `MINIBAR` · `LAVERIE` · `TRANSPORT` · `TELEPHONE` · `AUTRE`

---

## 11. Règles Métier

### Règle 1 — `isBlocked` vs `HORS_SERVICE`
Bloquer une chambre (`PATCH /rooms/:id/block` avec `isBlocked: true`) **passe automatiquement** son statut à `HORS_SERVICE`. La chambre n'apparaît plus dans la disponibilité. Débloquer (`isBlocked: false`) remet le statut à `LIBRE`. Le champ `status` peut aussi être modifié indépendamment via `PATCH /rooms/:id/status` par un manager, mais sans déclencher le mécanisme de blocage.

### Règle 2 — Cycle de vie automatique check-in/checkout
```
CHECK-IN  → Chambre : LIBRE/RESERVEE → OCCUPEE
           → Réservation : EN_ATTENTE/CONFIRMEE → CHECKED_IN
           → Séjour créé avec status ACTIF

CHECK-OUT → Chambre : OCCUPEE → EN_MENAGE (housekeepingStatus → SALE)
           → Réservation : CHECKED_IN → CHECKED_OUT
           → Séjour : ACTIF → CLOTURE
           → Tâche NETTOYAGE_COMPLET (priorité HAUTE) créée automatiquement

INSPECTION approuvée → Chambre : EN_MENAGE → LIBRE ou RESERVEE (housekeepingStatus → PROPRE)
```

### Règle 3 — Génération de facture
La facture est créée via `POST /bookings/:bookingId/bill`. Elle consolide :
- Les nuits d'hébergement (basePrice × nights)
- Tous les services du séjour non encore facturés
- L'acompte de réservation (`depositPaid`) est déduit comme premier paiement

### Règle 4 — Annulation de paiement
Un paiement peut être annulé si la facture n'est pas à l'état `PAYEE`. L'annulation recalcule automatiquement le solde et repasse le statut à `OUVERTE` ou `PARTIELLEMENT_PAYEE`.

### Règle 5 — Modification de réservation
Une réservation ne peut être modifiée que si elle est en statut `EN_ATTENTE` ou `CONFIRMEE`. Les réservations `CHECKED_IN`, `CHECKED_OUT`, `ANNULEE` et `NO_SHOW` sont immuables. Pour prolonger un séjour en cours, utiliser `POST /bookings/:bookingId/extend`.

---

## Flux Opérationnel Type

```
1. Créer un type de chambre      POST /room-types
2. Créer des chambres            POST /rooms
3. Configurer les tarifs         POST /rates
4. Prendre une réservation       POST /bookings
5. Confirmer la réservation      POST /bookings/:id/confirm
6. Check-in à l'arrivée          POST /bookings/:id/checkin
   → Chambre passe à OCCUPEE automatiquement
7. Ajouter des services séjour   POST /stays/:id/services
8. Check-out au départ           POST /bookings/:id/checkout
   → Chambre passe à EN_MENAGE, tâche créée automatiquement
9. Housekeeping démarre          PATCH /housekeeping/:id/start
10. Housekeeping terminé          PATCH /housekeeping/:id/complete
11. Inspection                    PATCH /housekeeping/:id/inspect { "passed": true }
    → Chambre passe à LIBRE automatiquement
12. Générer la facture            POST /bookings/:id/bill
13. Encaisser le paiement         POST /bills/:id/payments
```
