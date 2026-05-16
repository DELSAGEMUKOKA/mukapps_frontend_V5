# Module Restaurant / Bar — MUKAPPS

## Vue d'ensemble

Le module Restaurant/Bar est une extension du système MUKAPPS destinée aux établissements de restauration, bars, brasseries et cafés. Il s'intègre pleinement dans l'architecture modulaire existante et s'appuie sur les systèmes d'authentification, de permissions et d'API déjà en place.

---

## 1. Intégration dans l'architecture existante

### 1.1 Enregistrement du module

Le module `restaurant` est déjà déclaré dans `src/shared/constants/modules.ts` :

```typescript
export const MODULES = {
  // ... modules existants
  RESTAURANT: 'restaurant',
} as const;
```

Il faut l'ajouter à `src/core/config/modules.ts` dans le tableau `AVAILABLE_MODULES` :

```typescript
{
  name: 'restaurant',
  label: 'Restaurant / Bar',
  description: 'Gestion des tables, menu, commandes, tickets et réservations',
  icon: 'UtensilsCrossed',
  routes: [
    '/restaurant',
    '/restaurant/tables',
    '/restaurant/menu',
    '/restaurant/orders',
    '/restaurant/kitchen',
    '/restaurant/bills',
    '/restaurant/reservations',
    '/restaurant/reports',
  ],
  requiredRoles: ['ADMIN', 'SUPERVISOR', 'OPERATOR', 'CASHIER'],
},
```

### 1.2 Structure des fichiers à créer

```
src/modules/restaurant/
├── api/
│   ├── tablesApi.ts          # CRUD tables + statuts
│   ├── menuApi.ts            # Catégories + articles du menu
│   ├── ordersApi.ts          # Commandes + articles
│   ├── kitchenApi.ts         # Écran cuisine/bar
│   ├── billsApi.ts           # Tickets (brouillon → paiement)
│   ├── reservationsApi.ts    # Réservations
│   └── dashboardApi.ts       # Dashboard + rapports
├── components/
│   ├── TableGrid.tsx          # Grille visuelle des tables
│   ├── TableCard.tsx          # Carte d'une table avec statut
│   ├── MenuItemCard.tsx       # Carte article du menu
│   ├── OrderItemRow.tsx       # Ligne article dans une commande
│   ├── KitchenTicket.tsx      # Ticket cuisine/bar
│   ├── BillSummary.tsx        # Résumé ticket client
│   ├── PaymentModal.tsx       # Modal de paiement
│   └── ReservationCard.tsx    # Carte réservation
├── pages/
│   ├── RestaurantDashboard.tsx   # Tableau de bord principal
│   ├── Tables.tsx                # Gestion et vue des tables
│   ├── Menu.tsx                  # Gestion du menu (catégories + articles)
│   ├── Orders.tsx                # Liste des commandes actives
│   ├── OrderDetail.tsx           # Détail d'une commande + ajout articles
│   ├── KitchenDisplay.tsx        # Écran cuisine / bar
│   ├── Bills.tsx                 # Liste des tickets
│   ├── BillDetail.tsx            # Détail ticket + paiement
│   ├── Reservations.tsx          # Gestion des réservations
│   └── RestaurantReports.tsx     # Rapports et statistiques
├── routes.tsx                    # Routes du module avec guards
└── manifest.json                 # Métadonnées du module
```

### 1.3 Ajout dans AppRoutes.tsx

```typescript
import { restaurantRoutes } from '@/modules/restaurant/routes';

// Dans le tableau children de PrivateRoute > MainLayout :
...restaurantRoutes,
```

---

## 2. Permissions et rôles

### 2.1 Nouvelles permissions à ajouter dans `src/shared/constants/permissions.ts`

```typescript
// Restaurant / Bar
RESTAURANT_VIEW_DASHBOARD: 'restaurant.view_dashboard',
RESTAURANT_MANAGE_TABLES: 'restaurant.manage_tables',
RESTAURANT_VIEW_TABLES: 'restaurant.view_tables',
RESTAURANT_MANAGE_MENU: 'restaurant.manage_menu',
RESTAURANT_CREATE_ORDER: 'restaurant.create_order',
RESTAURANT_VIEW_ORDERS: 'restaurant.view_orders',
RESTAURANT_SEND_TO_KITCHEN: 'restaurant.send_to_kitchen',
RESTAURANT_KITCHEN_DISPLAY: 'restaurant.kitchen_display',
RESTAURANT_MANAGE_BILLS: 'restaurant.manage_bills',
RESTAURANT_PROCESS_PAYMENT: 'restaurant.process_payment',
RESTAURANT_MANAGE_RESERVATIONS: 'restaurant.manage_reservations',
RESTAURANT_VIEW_REPORTS: 'restaurant.view_reports',
```

### 2.2 Matrice des permissions par rôle

| Permission | ADMIN | SUPERVISOR | OPERATOR | CASHIER |
|---|:---:|:---:|:---:|:---:|
| view_dashboard | oui | oui | oui | oui |
| manage_tables | oui | oui | non | non |
| view_tables | oui | oui | oui | oui |
| manage_menu | oui | oui | non | non |
| create_order | oui | oui | oui | oui |
| view_orders | oui | oui | oui | oui |
| send_to_kitchen | oui | oui | oui | oui |
| kitchen_display | oui | oui | oui | oui |
| manage_bills | oui | oui | oui | oui |
| process_payment | oui | oui | oui | oui |
| manage_reservations | oui | oui | oui | non |
| view_reports | oui | oui | non | non |

### 2.3 Nouvelles clés `pages` dans `src/shared/constants/rolePermissions.ts`

```typescript
// Ajouter dans le bloc pages de chaque rôle :
restaurant: true,
restaurantTables: true,
restaurantMenu: boolean,      // false pour CASHIER
restaurantOrders: true,
restaurantKitchen: true,
restaurantBills: true,
restaurantReservations: boolean,  // false pour CASHIER
restaurantReports: boolean,   // false pour OPERATOR et CASHIER
```

---

## 3. Routes du module

### `src/modules/restaurant/routes.tsx`

```typescript
import type { RouteObject } from 'react-router-dom';
import ModuleGuard from '@/core/components/guards/ModuleGuard';
import PageGuard from '@/core/components/guards/PageGuard';

function guard(page: string, importFn: () => Promise<{ default: React.ComponentType }>) {
  return {
    lazy: async () => {
      const mod = await importFn();
      const Component = mod.default;
      const Guarded = () => (
        <ModuleGuard module="restaurant">
          <PageGuard page={page as any}>
            <Component />
          </PageGuard>
        </ModuleGuard>
      );
      return { Component: Guarded };
    },
  };
}

export const restaurantRoutes: RouteObject[] = [
  { path: 'restaurant',            ...guard('restaurant',            () => import('./pages/RestaurantDashboard')) },
  { path: 'restaurant/tables',     ...guard('restaurantTables',      () => import('./pages/Tables')) },
  { path: 'restaurant/menu',       ...guard('restaurantMenu',        () => import('./pages/Menu')) },
  { path: 'restaurant/orders',     ...guard('restaurantOrders',      () => import('./pages/Orders')) },
  { path: 'restaurant/orders/:id', ...guard('restaurantOrders',      () => import('./pages/OrderDetail')) },
  { path: 'restaurant/kitchen',    ...guard('restaurantKitchen',     () => import('./pages/KitchenDisplay')) },
  { path: 'restaurant/bills',      ...guard('restaurantBills',       () => import('./pages/Bills')) },
  { path: 'restaurant/bills/:id',  ...guard('restaurantBills',       () => import('./pages/BillDetail')) },
  { path: 'restaurant/reservations', ...guard('restaurantReservations', () => import('./pages/Reservations')) },
  { path: 'restaurant/reports',    ...guard('restaurantReports',     () => import('./pages/RestaurantReports')) },
];
```

---

## 4. API Reference complète

Base URL : `GET|POST|PUT|PATCH|DELETE /api/restaurant/...`
Authentification : `Bearer <JWT>` (même intercepteur Axios que les autres modules)

### 4.1 Tables

| Méthode | Endpoint | Description |
|---|---|---|
| GET | `/api/restaurant/tables` | Lister toutes les tables |
| GET | `/api/restaurant/tables/stats` | Statistiques des tables (libres/occupées) |
| GET | `/api/restaurant/tables/:id` | Détail d'une table |
| POST | `/api/restaurant/tables` | Créer une table |
| PUT | `/api/restaurant/tables/:id` | Modifier une table |
| PATCH | `/api/restaurant/tables/:id/status` | Changer le statut (`LIBRE` / `OCCUPEE` / `RESERVEE`) |
| DELETE | `/api/restaurant/tables/:id` | Supprimer une table |

**Corps — Créer/modifier une table :**
```json
{
  "number": 1,
  "capacity": 4,
  "zone": "Salle principale"
}
```

**Statuts de table :**
- `LIBRE` — disponible
- `OCCUPEE` — clients en cours
- `RESERVEE` — réservation à venir

**Zones typiques :** `Salle principale`, `Bar`, `Terrasse`, `VIP`, `Salon privé`

---

### 4.2 Menu

#### Catégories

| Méthode | Endpoint | Description |
|---|---|---|
| GET | `/api/restaurant/menu/full` | Menu complet (catégories + articles) |
| GET | `/api/restaurant/menu/categories` | Lister les catégories |
| POST | `/api/restaurant/menu/categories` | Créer une catégorie |
| PUT | `/api/restaurant/menu/categories/:id` | Modifier une catégorie |
| DELETE | `/api/restaurant/menu/categories/:id` | Supprimer une catégorie |

**Corps — Catégorie :**
```json
{
  "name": "Boissons & Cocktails",
  "description": "Boissons, cocktails et alcools",
  "sortOrder": 1
}
```

#### Articles du menu

| Méthode | Endpoint | Description |
|---|---|---|
| GET | `/api/restaurant/menu/items?page=1&limit=20` | Lister les articles (paginé) |
| GET | `/api/restaurant/menu/items?categoryId=X&available=true` | Filtrer par catégorie / disponibilité |
| GET | `/api/restaurant/menu/items/:id` | Détail d'un article |
| POST | `/api/restaurant/menu/items` | Créer un article |
| PUT | `/api/restaurant/menu/items/:id` | Modifier un article |
| PATCH | `/api/restaurant/menu/items/:id/availability` | Basculer disponibilité |
| DELETE | `/api/restaurant/menu/items/:id` | Supprimer un article |

**Corps — Article du menu :**
```json
{
  "name": "Whisky Single Malt",
  "description": "Whisky premium",
  "price": 6.00,
  "categoryId": "uuid-catégorie",
  "station": "BAR",
  "preparationTime": 2,
  "isAvailable": true
}
```

**Stations de préparation :**
- `BAR` — préparé au bar (boissons, cocktails)
- `CUISINE` — préparé en cuisine (plats chauds, entrées, desserts)

---

### 4.3 Commandes

| Méthode | Endpoint | Description |
|---|---|---|
| GET | `/api/restaurant/orders?page=1&limit=20` | Lister les commandes (paginé) |
| GET | `/api/restaurant/orders?status=EN_COURS` | Filtrer par statut |
| GET | `/api/restaurant/orders/:id` | Détail d'une commande |
| POST | `/api/restaurant/orders` | Créer une commande |
| POST | `/api/restaurant/orders/:id/items` | Ajouter des articles à une commande |
| PATCH | `/api/restaurant/orders/:id/items/:itemId` | Modifier un article (quantité, notes) |
| DELETE | `/api/restaurant/orders/:id/items/:itemId` | Retirer un article |
| POST | `/api/restaurant/orders/:id/send` | Envoyer en cuisine / bar |
| PATCH | `/api/restaurant/orders/:id/cancel` | Annuler la commande |
| GET | `/api/restaurant/orders/:id/bill` | Obtenir le ticket de la commande (crée si absent) |

**Corps — Créer une commande :**
```json
{
  "tableId": "uuid-table",
  "type": "SUR_PLACE",
  "guestCount": 2,
  "notes": "Clients VIP"
}
```

**Corps — Commande à emporter :**
```json
{
  "type": "A_EMPORTER",
  "guestCount": 1,
  "notes": "Commande à emporter"
}
```

**Types de commande :**
- `SUR_PLACE` — table assignée obligatoire
- `A_EMPORTER` — sans table

**Corps — Ajouter des articles :**
```json
{
  "items": [
    {
      "menuItemId": "uuid-article",
      "quantity": 2,
      "unitId": "uuid-unité-optionnel",
      "notes": "Bien serré"
    }
  ]
}
```

**Statuts de commande :**
- `EN_ATTENTE` — créée, pas encore envoyée
- `EN_COURS` — envoyée en cuisine/bar
- `SERVIE` — tous les articles servis
- `ANNULEE` — annulée

---

### 4.4 Écran Cuisine / Bar

| Méthode | Endpoint | Description |
|---|---|---|
| GET | `/api/restaurant/kitchen` | Articles actifs en attente de préparation |
| GET | `/api/restaurant/kitchen/ready` | Articles prêts à servir |
| PATCH | `/api/restaurant/kitchen/items/:id/prepare` | Marquer en préparation |
| PATCH | `/api/restaurant/kitchen/items/:id/ready` | Marquer prêt |
| PATCH | `/api/restaurant/kitchen/items/:id/served` | Marquer servi |

**Cycle de vie d'un article cuisine :**
```
EN_ATTENTE → EN_PREPARATION → PRET → SERVI
```

---

### 4.5 Tickets (Brouillon → Paiement)

Le système de tickets suit un cycle en 3 phases : **brouillon** → **validé** → **clôturé**.

| Méthode | Endpoint | Description |
|---|---|---|
| GET | `/api/restaurant/bills?page=1&limit=20` | Lister les tickets |
| GET | `/api/restaurant/bills?status=BROUILLON` | Filtrer par statut |
| GET | `/api/restaurant/bills/:id` | Détail d'un ticket |
| POST | `/api/restaurant/orders/:orderId/bill/draft` | Créer un ticket brouillon |
| POST | `/api/restaurant/bills/:id/draft/items` | Ajouter un article au brouillon |
| PATCH | `/api/restaurant/bills/:id/draft/items/:itemId` | Modifier un article du brouillon |
| DELETE | `/api/restaurant/bills/:id/draft/items/:itemId` | Retirer un article du brouillon |
| PATCH | `/api/restaurant/bills/:id/draft/notes` | Modifier les notes du brouillon |
| POST | `/api/restaurant/bills/:id/validate` | Valider le brouillon → ticket final (statut `OUVERTE`) |
| POST | `/api/restaurant/bills/:id/payment` | Enregistrer un paiement (partiel ou complet) |
| POST | `/api/restaurant/bills/:id/close` | Clôturer le ticket (libère la table) |
| POST | `/api/restaurant/bills/:id/cancel` | Annuler un ticket |

**Corps — Créer un ticket brouillon :**
```json
{
  "notes": "Table anniversaire"
}
```

**Corps — Paiement :**
```json
{
  "amount": 100.00,
  "paymentMethod": "CASH",
  "reference": null,
  "notes": "Paiement en espèces"
}
```

**Méthodes de paiement :**
- `CASH` — espèces
- `CARD` — carte bancaire
- `MOBILE` — paiement mobile
- `TRANSFER` — virement

**Statuts de ticket :**
- `BROUILLON` — en cours de préparation, modifiable
- `OUVERTE` — validé, en attente de paiement
- `PAYEE_PARTIEL` — paiement partiel enregistré
- `PAYEE` — entièrement payé
- `CLOTUREE` — clôturé, table libérée
- `ANNULEE` — annulé

---

### 4.6 Réservations

| Méthode | Endpoint | Description |
|---|---|---|
| GET | `/api/restaurant/reservations?page=1&limit=20` | Lister les réservations |
| GET | `/api/restaurant/reservations?date=YYYY-MM-DD` | Filtrer par date |
| GET | `/api/restaurant/reservations/:id` | Détail d'une réservation |
| POST | `/api/restaurant/reservations` | Créer une réservation |
| PATCH | `/api/restaurant/reservations/:id/confirm` | Confirmer la réservation |
| PATCH | `/api/restaurant/reservations/:id/arrive` | Marquer l'arrivée du client |
| PATCH | `/api/restaurant/reservations/:id/cancel` | Annuler la réservation |

**Corps — Créer une réservation :**
```json
{
  "tableId": "uuid-table",
  "customerName": "Jean Dupont",
  "customerPhone": "+33612345678",
  "guestCount": 4,
  "scheduledAt": "2026-05-12T20:00:00.000Z",
  "notes": "Anniversaire, prévoir gâteau"
}
```

**Statuts de réservation :**
- `EN_ATTENTE` — créée, non confirmée
- `CONFIRMEE` — confirmée
- `ARRIVEE` — client arrivé
- `ANNULEE` — annulée
- `NO_SHOW` — client absent

---

### 4.7 Dashboard & Rapports

| Méthode | Endpoint | Description |
|---|---|---|
| GET | `/api/restaurant/dashboard` | KPIs principaux (CA jour, tables, commandes actives) |
| GET | `/api/restaurant/dashboard/reports/daily?date=YYYY-MM-DD` | Rapport journalier détaillé |
| GET | `/api/restaurant/dashboard/reports/items?startDate=X&endDate=Y&limit=10` | Top articles vendus |
| GET | `/api/restaurant/dashboard/reports/servers?startDate=X&endDate=Y` | Performance par serveur |
| GET | `/api/restaurant/dashboard/reports/tables?startDate=X&endDate=Y` | Taux d'occupation des tables |

---

### 4.8 Unités de vente multi-formats (Bar)

Permet de vendre un même produit en différentes mesures (Shot 50ml, Verre 150ml, Bouteille 700ml). Ces endpoints sont rattachés aux produits du magasin.

| Méthode | Endpoint | Description |
|---|---|---|
| GET | `/api/products/:productId/units` | Lister les unités d'un produit |
| GET | `/api/products/:productId/units/:unitId` | Détail d'une unité |
| POST | `/api/products/:productId/units` | Créer une unité |
| POST | `/api/products/:productId/units/bulk` | Créer plusieurs unités en lot |
| PUT | `/api/products/:productId/units/:unitId` | Modifier une unité |
| DELETE | `/api/products/:productId/units/:unitId` | Supprimer une unité |

**Corps — Créer une unité :**
```json
{
  "unitName": "Shot",
  "quantityInStockUnit": 0.05,
  "sellingPrice": 5.00,
  "sortOrder": 1
}
```

**Exemple complet — Whisky :**
```json
{
  "units": [
    { "unitName": "Shot",     "quantityInStockUnit": 0.05, "sellingPrice": 5.00,  "sortOrder": 1 },
    { "unitName": "Verre",    "quantityInStockUnit": 0.15, "sellingPrice": 12.00, "sortOrder": 2 },
    { "unitName": "Bouteille","quantityInStockUnit": 0.70, "sellingPrice": 60.00, "sortOrder": 3 }
  ]
}
```

---

## 5. Constantes API à ajouter

Dans `src/shared/constants/apiEndpoints.ts`, ajouter la section `RESTAURANT` :

```typescript
RESTAURANT: {
  // Tables
  TABLES: '/restaurant/tables',
  TABLE_BY_ID: (id: string) => `/restaurant/tables/${id}`,
  TABLE_STATUS: (id: string) => `/restaurant/tables/${id}/status`,
  TABLE_STATS: '/restaurant/tables/stats',

  // Menu
  MENU_FULL: '/restaurant/menu/full',
  MENU_CATEGORIES: '/restaurant/menu/categories',
  MENU_CATEGORY_BY_ID: (id: string) => `/restaurant/menu/categories/${id}`,
  MENU_ITEMS: '/restaurant/menu/items',
  MENU_ITEM_BY_ID: (id: string) => `/restaurant/menu/items/${id}`,
  MENU_ITEM_AVAILABILITY: (id: string) => `/restaurant/menu/items/${id}/availability`,

  // Commandes
  ORDERS: '/restaurant/orders',
  ORDER_BY_ID: (id: string) => `/restaurant/orders/${id}`,
  ORDER_ITEMS: (id: string) => `/restaurant/orders/${id}/items`,
  ORDER_ITEM: (orderId: string, itemId: string) => `/restaurant/orders/${orderId}/items/${itemId}`,
  ORDER_SEND: (id: string) => `/restaurant/orders/${id}/send`,
  ORDER_CANCEL: (id: string) => `/restaurant/orders/${id}/cancel`,
  ORDER_BILL: (id: string) => `/restaurant/orders/${id}/bill`,
  ORDER_BILL_DRAFT: (id: string) => `/restaurant/orders/${id}/bill/draft`,

  // Cuisine
  KITCHEN: '/restaurant/kitchen',
  KITCHEN_READY: '/restaurant/kitchen/ready',
  KITCHEN_ITEM_PREPARE: (id: string) => `/restaurant/kitchen/items/${id}/prepare`,
  KITCHEN_ITEM_READY: (id: string) => `/restaurant/kitchen/items/${id}/ready`,
  KITCHEN_ITEM_SERVED: (id: string) => `/restaurant/kitchen/items/${id}/served`,

  // Tickets
  BILLS: '/restaurant/bills',
  BILL_BY_ID: (id: string) => `/restaurant/bills/${id}`,
  BILL_DRAFT_ITEMS: (id: string) => `/restaurant/bills/${id}/draft/items`,
  BILL_DRAFT_ITEM: (billId: string, itemId: string) => `/restaurant/bills/${billId}/draft/items/${itemId}`,
  BILL_DRAFT_NOTES: (id: string) => `/restaurant/bills/${id}/draft/notes`,
  BILL_VALIDATE: (id: string) => `/restaurant/bills/${id}/validate`,
  BILL_PAYMENT: (id: string) => `/restaurant/bills/${id}/payment`,
  BILL_CLOSE: (id: string) => `/restaurant/bills/${id}/close`,
  BILL_CANCEL: (id: string) => `/restaurant/bills/${id}/cancel`,

  // Réservations
  RESERVATIONS: '/restaurant/reservations',
  RESERVATION_BY_ID: (id: string) => `/restaurant/reservations/${id}`,
  RESERVATION_CONFIRM: (id: string) => `/restaurant/reservations/${id}/confirm`,
  RESERVATION_ARRIVE: (id: string) => `/restaurant/reservations/${id}/arrive`,
  RESERVATION_CANCEL: (id: string) => `/restaurant/reservations/${id}/cancel`,

  // Dashboard
  DASHBOARD: '/restaurant/dashboard',
  REPORT_DAILY: '/restaurant/dashboard/reports/daily',
  REPORT_ITEMS: '/restaurant/dashboard/reports/items',
  REPORT_SERVERS: '/restaurant/dashboard/reports/servers',
  REPORT_TABLES: '/restaurant/dashboard/reports/tables',

  // Unités de vente (produits magasin)
  PRODUCT_UNITS: (productId: string) => `/products/${productId}/units`,
  PRODUCT_UNIT_BY_ID: (productId: string, unitId: string) => `/products/${productId}/units/${unitId}`,
  PRODUCT_UNITS_BULK: (productId: string) => `/products/${productId}/units/bulk`,
},
```

---

## 6. Sidebar — Entrées de navigation

Dans `src/core/layouts/components/Sidebar.tsx`, ajouter les entrées pour le module restaurant :

```typescript
{
  module: 'restaurant',
  label: 'Restaurant / Bar',
  icon: UtensilsCrossed,
  items: [
    { path: '/restaurant',              label: 'Tableau de bord',  icon: LayoutDashboard,  page: 'restaurant' },
    { path: '/restaurant/tables',       label: 'Tables',           icon: Grid3X3,          page: 'restaurantTables' },
    { path: '/restaurant/menu',         label: 'Menu',             icon: BookOpen,         page: 'restaurantMenu' },
    { path: '/restaurant/orders',       label: 'Commandes',        icon: ClipboardList,    page: 'restaurantOrders' },
    { path: '/restaurant/kitchen',      label: 'Cuisine / Bar',    icon: ChefHat,          page: 'restaurantKitchen' },
    { path: '/restaurant/bills',        label: 'Tickets',          icon: Receipt,          page: 'restaurantBills' },
    { path: '/restaurant/reservations', label: 'Réservations',     icon: CalendarCheck,    page: 'restaurantReservations' },
    { path: '/restaurant/reports',      label: 'Rapports',         icon: BarChart2,        page: 'restaurantReports' },
  ],
},
```

---

## 7. Flux opérationnel principal

### 7.1 Service en salle (flux complet)

```
1. ADMIN/SUPERVISOR configure les tables et le menu
        ↓
2. OPERATOR/CASHIER sélectionne une table (statut : LIBRE → OCCUPEE)
        ↓
3. Création d'une commande (type: SUR_PLACE)
        ↓
4. Ajout des articles commandés par le client
   (avec unités de vente pour les alcools : Shot / Verre / Bouteille)
        ↓
5. Envoi en cuisine / bar (/orders/:id/send)
   → Articles visibles sur l'écran KitchenDisplay
        ↓
6. Cuisine/Bar met à jour le statut des articles :
   EN_ATTENTE → EN_PREPARATION → PRET → SERVI
        ↓
7. Création du ticket brouillon (/orders/:id/bill/draft)
   → Possibilité d'ajuster les articles et quantités
        ↓
8. Validation du brouillon (/bills/:id/validate)
   → Ticket passe en statut OUVERTE
        ↓
9. Encaissement (/bills/:id/payment)
   → Paiement complet ou partiel (CASH / CARD / MOBILE)
        ↓
10. Clôture du ticket (/bills/:id/close)
    → Table libérée automatiquement (statut : OCCUPEE → LIBRE)
```

### 7.2 Commande à emporter

```
1. Créer une commande sans tableId (type: A_EMPORTER)
2. Ajouter les articles
3. Envoyer en cuisine/bar
4. Créer ticket brouillon → valider → payer → clôturer
```

### 7.3 Gestion des réservations

```
1. Client appelle → création réservation (statut: EN_ATTENTE)
        ↓
2. Confirmation par l'établissement (/confirm → CONFIRMEE)
        ↓
3. Arrivée du client (/arrive → ARRIVEE)
   → Table passe en RESERVEE puis OCCUPEE
        ↓
4. Création de la commande liée à la réservation
        ↓
(Flux standard de commande)
```

---

## 8. Modèles de données (référence)

### Table
| Champ | Type | Description |
|---|---|---|
| id | uuid | Identifiant unique |
| number | integer | Numéro de la table |
| capacity | integer | Nombre de couverts maximum |
| zone | string | Zone de la salle (Bar, Terrasse, etc.) |
| status | enum | `LIBRE` / `OCCUPEE` / `RESERVEE` |
| companyId | uuid | Société propriétaire |

### MenuItem (Article du menu)
| Champ | Type | Description |
|---|---|---|
| id | uuid | Identifiant unique |
| name | string | Nom de l'article |
| description | string | Description |
| price | decimal | Prix de base |
| categoryId | uuid | Catégorie du menu |
| station | enum | `BAR` ou `CUISINE` |
| preparationTime | integer | Temps de préparation en minutes |
| isAvailable | boolean | Disponible à la vente |

### Order (Commande)
| Champ | Type | Description |
|---|---|---|
| id | uuid | Identifiant unique |
| tableId | uuid | Table (null si à emporter) |
| type | enum | `SUR_PLACE` / `A_EMPORTER` |
| status | enum | `EN_ATTENTE` / `EN_COURS` / `SERVIE` / `ANNULEE` |
| guestCount | integer | Nombre de couverts |
| notes | string | Notes spéciales |
| items | array | Articles commandés |

### Bill (Ticket)
| Champ | Type | Description |
|---|---|---|
| id | uuid | Identifiant unique |
| orderId | uuid | Commande associée |
| status | enum | `BROUILLON` / `OUVERTE` / `PAYEE_PARTIEL` / `PAYEE` / `CLOTUREE` / `ANNULEE` |
| totalAmount | decimal | Montant total |
| paidAmount | decimal | Montant déjà payé |
| remainingAmount | decimal | Reste à payer |
| draftItems | array | Articles du brouillon (modifiables) |
| payments | array | Paiements enregistrés |
| notes | string | Notes du ticket |

### Reservation (Réservation)
| Champ | Type | Description |
|---|---|---|
| id | uuid | Identifiant unique |
| tableId | uuid | Table réservée |
| customerName | string | Nom du client |
| customerPhone | string | Téléphone |
| guestCount | integer | Nombre de couverts |
| scheduledAt | datetime | Date et heure de la réservation |
| status | enum | `EN_ATTENTE` / `CONFIRMEE` / `ARRIVEE` / `ANNULEE` / `NO_SHOW` |
| notes | string | Notes (ex: anniversaire) |

### ProductUnit (Unité de vente)
| Champ | Type | Description |
|---|---|---|
| id | uuid | Identifiant unique |
| productId | uuid | Produit du magasin associé |
| unitName | string | Nom de l'unité (Shot, Verre, Bouteille) |
| quantityInStockUnit | decimal | Quantité consommée dans l'unité de stock |
| sellingPrice | decimal | Prix de vente pour cette unité |
| sortOrder | integer | Ordre d'affichage |
| isActive | boolean | Unité active |

---

## 9. Dépendances et intégrations avec les modules existants

| Module | Type d'intégration | Détail |
|---|---|---|
| **Magasin / Stock** | Forte | Les articles du menu peuvent être liés à des produits du magasin. Les unités de vente déduisent le stock automatiquement (`quantityInStockUnit`) |
| **Clients** | Optionnelle | Possibilité d'associer une commande ou réservation à un client existant (fidélisation) |
| **Facturation** | Optionnelle | Les tickets clôturés peuvent générer des factures via le module Invoicing |
| **Rapports** | Lecture seule | Les données du module alimentent les rapports financiers globaux |
| **Utilisateurs** | Permissions | Les rôles et permissions existants s'appliquent directement |

---

## 10. Points d'attention pour l'implémentation

1. **Libération automatique des tables** — Lors de la clôture d'un ticket (`/bills/:id/close`), le backend doit automatiquement passer le statut de la table associée à `LIBRE`.

2. **Écran cuisine temps réel** — La page `KitchenDisplay` doit se rafraîchir en temps réel (polling ou WebSocket) pour afficher les nouvelles commandes instantanément.

3. **Ticket brouillon modifiable** — Le brouillon permet d'ajuster les articles (ajout/suppression/quantité) avant validation. Une fois validé (`OUVERTE`), le ticket n'est plus modifiable.

4. **Paiements partiels** — Le système supporte les paiements partiels successifs. Le ticket reste `PAYEE_PARTIEL` jusqu'à ce que `paidAmount >= totalAmount`.

5. **Unités de vente et stock** — Quand un article avec `unitId` est commandé, le backend doit déduire `quantityInStockUnit` du stock du produit associé.

6. **Gestion des zones** — Les zones de tables sont libres (chaîne de texte) pour s'adapter à chaque établissement.

7. **ModuleGuard obligatoire** — Toutes les routes doivent être enveloppées dans `<ModuleGuard module="restaurant">` pour respecter l'activation par abonnement.
