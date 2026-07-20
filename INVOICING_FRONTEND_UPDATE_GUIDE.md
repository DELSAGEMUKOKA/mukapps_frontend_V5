# Guide de Mise à Jour Frontend — Module Facturation

**Version :** 2.0  
**Date :** 2026-06-05  
**Auteur :** Équipe Backend  
**Destinataire :** Développeur Frontend

---

## Contexte

Le module de facturation (Devis, Proforma, Facture) a été mis à jour pour être **universel** et supporter tous les types d'entreprises : commerce général, vente de parcelles, vente de véhicules, entreprises minières, prestataires de services, etc.

### Nouvelles fonctionnalités

| Fonctionnalité | Avant | Après |
|---|---|---|
| Quantité par ligne | Entier (`1`, `2`, `10`) | Décimal (`0.5`, `2.75`, `1.25`) |
| Unité de mesure | Aucune | `pièce`, `tonne`, `heure`, `m²`, `lot`, `forfait`, etc. |
| Devise du document | Héritée globalement | Configurable par document (`FC`, `USD`, `EUR`, etc.) |
| Libellé de taxe | "TVA" en dur | Configurable (`TVA`, `Redevance`, `GST`, `Tax`, etc.) |

---

## Migration de base de données requise

> **IMPORTANT :** Avant tout test, la base de données doit être migrée.

```bash
npx prisma migrate dev --name add_unit_currency_taxlabel
# OU en production :
npx prisma migrate deploy
```

---

## 1. Changements dans les formulaires de création/édition

### 1.1 Champ `quantity` — Accepter les décimaux

**Avant :** le champ était de type `number` entier (step="1")

**Après :** le champ doit accepter les décimaux.

```html
<!-- AVANT -->
<input type="number" name="quantity" min="1" step="1" />

<!-- APRÈS -->
<input type="number" name="quantity" min="0.0001" step="any" />
```

```javascript
// Validation côté frontend — AVANT
quantity: Joi.number().integer().min(1).required()

// Validation côté frontend — APRÈS
quantity: Joi.number().positive().required()
// Exemples valides : 0.5, 1, 2.75, 100, 1500.25
```

---

### 1.2 Nouveau champ `unit` sur chaque ligne

Ajouter une colonne/champ "Unité" dans le tableau des lignes de document.

**Champ :**
```json
{
  "unit": "tonne"
}
```

**Valeurs suggérées (liste déroulante ou champ libre) :**

| Valeur | Description |
|---|---|
| `pièce` | Valeur par défaut |
| `tonne` | Industrie minière, agriculture |
| `kg` | Alimentation, chimie |
| `litre` | Hydrocarbures, boissons |
| `m²` | Immobilier, construction |
| `m³` | BTP, bois, matériaux |
| `heure` | Consulting, services |
| `jour` | Location, prestations |
| `mois` | Abonnements |
| `lot` | Immobilier (parcelles) |
| `véhicule` | Vente automobile |
| `forfait` | Services packagés |

**Recommandation UI :** combo-box (liste prédéfinie + possibilité de saisir librement).

**Intégration dans le tableau des lignes :**

```jsx
// Tableau de lignes — nouvelle colonne
<table>
  <thead>
    <tr>
      <th>Description</th>
      <th>Quantité</th>
      <th>Unité</th>          {/* NOUVEAU */}
      <th>Prix unitaire</th>
      <th>Taxe %</th>
      <th>Total</th>
    </tr>
  </thead>
  <tbody>
    {items.map((item, index) => (
      <tr key={index}>
        <td><input value={item.description} onChange={...} /></td>
        <td>
          <input type="number" step="any" min="0.0001"
                 value={item.quantity} onChange={...} />
        </td>
        <td>
          {/* NOUVEAU */}
          <select value={item.unit} onChange={...}>
            <option value="pièce">pièce</option>
            <option value="tonne">tonne</option>
            <option value="kg">kg</option>
            <option value="litre">litre</option>
            <option value="m²">m²</option>
            <option value="m³">m³</option>
            <option value="heure">heure</option>
            <option value="jour">jour</option>
            <option value="lot">lot</option>
            <option value="véhicule">véhicule</option>
            <option value="forfait">forfait</option>
          </select>
        </td>
        <td><input type="number" value={item.unitPrice} onChange={...} /></td>
        <td><input type="number" value={item.taxRate} onChange={...} /></td>
        <td>{(item.quantity * item.unitPrice).toFixed(2)}</td>
      </tr>
    ))}
  </tbody>
</table>
```

---

### 1.3 Nouveau champ `currency` sur le document

Ajouter un sélecteur de devise au niveau du formulaire principal (pas des lignes).

**Champ :**
```json
{
  "currency": "USD"
}
```

**Valeurs courantes :**

| Code | Devise |
|---|---|
| `FC` | Franc Congolais (défaut) |
| `USD` | Dollar américain |
| `EUR` | Euro |
| `XAF` | Franc CFA (CEMAC) |
| `XOF` | Franc CFA (UEMOA) |

**Emplacement UI :** En-tête du formulaire, à côté du titre ou dans une section "Paramètres du document".

```jsx
<div className="document-settings">
  <label>Devise</label>
  <select name="currency" value={formData.currency} onChange={handleChange}>
    <option value="FC">FC — Franc Congolais</option>
    <option value="USD">USD — Dollar américain</option>
    <option value="EUR">EUR — Euro</option>
    <option value="XAF">XAF — Franc CFA (CEMAC)</option>
    <option value="XOF">XOF — Franc CFA (UEMOA)</option>
  </select>
</div>
```

---

### 1.4 Nouveau champ `taxLabel` sur le document

Ajouter un champ pour le libellé de la taxe, à côté du taux de taxe global.

**Champ :**
```json
{
  "taxLabel": "TVA"
}
```

**Valeurs courantes :**

| Valeur | Contexte |
|---|---|
| `TVA` | Commerce général (défaut) |
| `Tax` | Documents en anglais |
| `GST` | Certains pays anglophones |
| `Redevance` | Entreprises minières |
| `Taxe de mutation` | Immobilier |
| `Droit de timbre` | Documents officiels |

**Emplacement UI :** Même section que le taux de taxe global.

```jsx
<div className="tax-settings">
  <div>
    <label>Libellé de la taxe</label>
    <input
      type="text"
      name="taxLabel"
      value={formData.taxLabel || 'TVA'}
      placeholder="Ex: TVA, Redevance, GST..."
      maxLength={50}
      onChange={handleChange}
    />
  </div>
  <div>
    <label>Taux de taxe global (%)</label>
    <input
      type="number"
      name="taxRate"
      value={formData.taxRate || 0}
      min="0"
      max="100"
      onChange={handleChange}
    />
  </div>
</div>
```

---

## 2. Structures JSON — Requêtes API

### 2.1 Création d'un Devis — `POST /api/invoicing/quotes`

```json
{
  "clientId": "uuid-du-client",
  "subject": "Devis travaux miniers - Site Kolwezi",
  "currency": "USD",
  "taxLabel": "Redevance",
  "taxRate": 5,
  "validityDays": 30,
  "discountPercentage": 0,
  "items": [
    {
      "description": "Extraction minerai de cuivre",
      "quantity": 150.5,
      "unit": "tonne",
      "unitPrice": 850.00,
      "taxRate": 5
    },
    {
      "description": "Transport et logistique",
      "quantity": 3,
      "unit": "forfait",
      "unitPrice": 12000.00,
      "taxRate": 0
    }
  ],
  "notes": "Prix valables pour commande ferme avant le 30/06/2026",
  "terms": "Paiement à 30 jours. Transport à la charge du client."
}
```

### 2.2 Création d'une Proforma — `POST /api/invoicing/proforma-invoices`

```json
{
  "clientId": "uuid-du-client",
  "subject": "Proforma - Vente Parcelle Ref. 2026-045",
  "currency": "USD",
  "taxLabel": "Taxe de mutation",
  "taxRate": 3,
  "shippingCost": 0,
  "discountPercentage": 0,
  "paymentTerms": "50% à la signature, 50% à la remise du titre",
  "items": [
    {
      "description": "Parcelle N°045 - Lotissement Les Collines, Commune de Ngaliema",
      "quantity": 1,
      "unit": "lot",
      "unitPrice": 45000.00,
      "taxRate": 3
    },
    {
      "description": "Frais de bornage et mesurage",
      "quantity": 1,
      "unit": "forfait",
      "unitPrice": 800.00,
      "taxRate": 0
    }
  ],
  "notes": "Ce document vaut engagement de vente sous réserve de vérification du titre foncier.",
  "terms": "Propriété transférée après paiement intégral."
}
```

### 2.3 Création d'une Facture — `POST /api/invoicing/invoices`

```json
{
  "clientId": "uuid-du-client",
  "subject": "Facture vente Toyota Land Cruiser 2024",
  "currency": "USD",
  "taxLabel": "TVA",
  "taxRate": 16,
  "invoiceDate": "2026-06-05",
  "dueDate": "2026-06-20",
  "shippingCost": 0,
  "discountPercentage": 2,
  "vatNumber": "A2301004M",
  "companyBankDetails": "Rawbank - Compte N° 00011-00234567-89 - SWIFT: RAWBCD KI",
  "paymentTerms": "Paiement comptant ou virement bancaire uniquement",
  "items": [
    {
      "description": "Toyota Land Cruiser 200 GX 4.5L - Année 2024 - Chassis JT3HJ10J3X4012345",
      "quantity": 1,
      "unit": "véhicule",
      "unitPrice": 95000.00,
      "taxRate": 16
    },
    {
      "description": "Immatriculation et formalités administratives",
      "quantity": 1,
      "unit": "forfait",
      "unitPrice": 1200.00,
      "taxRate": 0
    }
  ],
  "internalReference": "VEH-2026-0234",
  "notes": "Livraison incluse dans les 72h après confirmation du paiement."
}
```

---

## 3. Structures JSON — Réponses API

### 3.1 Objet Document (Devis / Proforma / Facture)

Les réponses incluent maintenant les nouveaux champs. Voici la structure complète d'une facture :

```json
{
  "id": "uuid",
  "companyId": "uuid",
  "invoiceNumber": "INV-2026-00012",
  "clientId": "uuid",
  "subject": "Facture vente véhicule",
  "status": "DRAFT",
  "invoiceDate": "2026-06-05T00:00:00.000Z",
  "dueDate": "2026-06-20T00:00:00.000Z",
  "currency": "USD",
  "taxLabel": "TVA",
  "taxRate": "16.00",
  "subtotal": "96200.00",
  "taxAmount": "15200.00",
  "discountAmount": "1924.00",
  "discountPercentage": "2.00",
  "shippingCost": "0.00",
  "totalAmount": "109476.00",
  "amountPaid": "0.00",
  "balanceDue": "109476.00",
  "isPaid": false,
  "isOverdue": false,
  "lineItems": [
    {
      "id": "uuid",
      "invoiceId": "uuid",
      "description": "Toyota Land Cruiser 200 GX 4.5L",
      "quantity": "1.0000",
      "unit": "véhicule",
      "unitPrice": "95000.00",
      "taxRate": "16.00",
      "lineTotal": "95000.00",
      "sequence": 0
    },
    {
      "id": "uuid",
      "invoiceId": "uuid",
      "description": "Immatriculation et formalités",
      "quantity": "1.0000",
      "unit": "forfait",
      "unitPrice": "1200.00",
      "taxRate": "0.00",
      "lineTotal": "1200.00",
      "sequence": 1
    }
  ],
  "payments": [],
  "client": {
    "id": "uuid",
    "firstName": "Jean",
    "lastName": "Mukendi",
    "email": "jean.mukendi@example.com",
    "phone": "+243810000000"
  }
}
```

> **Note sur les types :** Les valeurs `Decimal` retournées par l'API sont des **strings** (ex: `"1.0000"`, `"95000.00"`). Convertissez-les avec `parseFloat()` avant tout calcul.

---

## 4. Affichage dans les listes et vues détail

### 4.1 Tableau des lignes — Affichage

```jsx
// Affichage d'une ligne dans la vue détail
function LineItemRow({ item }) {
  const quantity = parseFloat(item.quantity);
  const unitPrice = parseFloat(item.unitPrice);
  const lineTotal = parseFloat(item.lineTotal);

  return (
    <tr>
      <td>{item.description}</td>
      <td>
        {/* Afficher quantité + unité */}
        {quantity % 1 === 0 ? quantity.toFixed(0) : quantity}
        {item.unit && item.unit !== 'pièce' && (
          <span className="unit-badge"> {item.unit}</span>
        )}
      </td>
      <td>{formatCurrency(unitPrice, document.currency)}</td>
      <td>{item.taxRate}%</td>
      <td>{formatCurrency(lineTotal, document.currency)}</td>
    </tr>
  );
}
```

### 4.2 Utilitaire de formatage — devise

```javascript
// utils/currency.js
const CURRENCY_SYMBOLS = {
  FC:  'FC',
  USD: '$',
  EUR: '€',
  XAF: 'FCFA',
  XOF: 'FCFA',
};

export function formatCurrency(amount, currency = 'FC') {
  const num = parseFloat(amount) || 0;
  const symbol = CURRENCY_SYMBOLS[currency] || currency;

  // Pour USD/EUR : format occidental avec 2 décimales
  if (['USD', 'EUR'].includes(currency)) {
    return `${symbol} ${num.toLocaleString('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  // Pour FC/FCFA : pas de centimes
  return `${num.toLocaleString('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })} ${symbol}`;
}

// Exemples :
// formatCurrency(95000, 'USD') → "$ 95,000.00"
// formatCurrency(95000, 'FC')  → "95 000 FC"
// formatCurrency(1500, 'EUR')  → "€ 1,500.00"
```

### 4.3 Affichage du libellé de taxe

```jsx
// Dans la section totaux
function TotalsSection({ totals, taxLabel, currency }) {
  return (
    <div className="totals-box">
      <div className="total-row">
        <span>Sous-total</span>
        <span>{formatCurrency(totals.subtotal, currency)}</span>
      </div>

      {totals.discountAmount > 0 && (
        <div className="total-row discount">
          <span>Remise ({totals.discountPercentage}%)</span>
          <span>-{formatCurrency(totals.discountAmount, currency)}</span>
        </div>
      )}

      {totals.taxAmount > 0 && (
        <div className="total-row">
          {/* Utiliser taxLabel dynamique au lieu de "TVA" en dur */}
          <span>{taxLabel || 'TVA'} ({totals.taxRate}%)</span>
          <span>{formatCurrency(totals.taxAmount, currency)}</span>
        </div>
      )}

      {totals.shippingCost > 0 && (
        <div className="total-row">
          <span>Frais de livraison</span>
          <span>{formatCurrency(totals.shippingCost, currency)}</span>
        </div>
      )}

      <div className="total-row grand-total">
        <span>Total à payer</span>
        <span>{formatCurrency(totals.totalAmount, currency)}</span>
      </div>
    </div>
  );
}
```

---

## 5. Calcul des totaux côté frontend (aperçu en temps réel)

Le calcul doit être synchronisé avec la logique backend. Voici la fonction exacte à implémenter :

```javascript
// utils/invoiceCalculator.js

export function calculateTotals(items, discountPercentage = 0, taxRate = 0, shippingCost = 0) {
  if (!items || items.length === 0) {
    return { subtotal: 0, discountAmount: 0, taxAmount: 0, shippingCost: 0, totalAmount: 0 };
  }

  // 1. Somme des lignes (sans taxe individuelle pour le calcul global)
  let subtotal = items.reduce((sum, item) => {
    const qty = parseFloat(item.quantity) || 0;
    const price = parseFloat(item.unitPrice) || 0;
    return sum + qty * price;
  }, 0);

  // 2. Appliquer la remise globale
  const discountAmount = subtotal * (discountPercentage / 100);
  subtotal = subtotal - discountAmount;

  // 3. Ajouter les frais de livraison
  subtotal += parseFloat(shippingCost) || 0;

  // 4. Calculer la taxe globale
  const taxAmount = subtotal * (taxRate / 100);
  const totalAmount = subtotal + taxAmount;

  return {
    subtotal: parseFloat(subtotal.toFixed(2)),
    discountAmount: parseFloat(discountAmount.toFixed(2)),
    taxAmount: parseFloat(taxAmount.toFixed(2)),
    shippingCost: parseFloat(shippingCost) || 0,
    totalAmount: parseFloat(totalAmount.toFixed(2)),
  };
}

// Calcul de la ligne individuelle
export function calculateLineTotal(quantity, unitPrice) {
  const qty = parseFloat(quantity) || 0;
  const price = parseFloat(unitPrice) || 0;
  return parseFloat((qty * price).toFixed(2));
}
```

---

## 6. State initial du formulaire

Mettre à jour l'état initial pour inclure les nouveaux champs :

```javascript
// Formulaire Devis
const initialQuoteState = {
  clientId: '',
  subject: '',
  description: '',
  currency: 'FC',        // NOUVEAU
  taxLabel: 'TVA',       // NOUVEAU
  taxRate: 0,
  validityDays: 30,
  discountPercentage: 0,
  notes: '',
  terms: '',
  items: [
    {
      description: '',
      quantity: 1,
      unit: 'pièce',     // NOUVEAU
      unitPrice: 0,
      taxRate: 0,
    }
  ],
};

// Formulaire Proforma
const initialProformaState = {
  clientId: '',
  subject: '',
  description: '',
  currency: 'FC',        // NOUVEAU
  taxLabel: 'TVA',       // NOUVEAU
  taxRate: 0,
  shippingCost: 0,
  discountPercentage: 0,
  paymentTerms: '',
  deliveryDetails: '',
  notes: '',
  terms: '',
  items: [
    {
      description: '',
      quantity: 1,
      unit: 'pièce',     // NOUVEAU
      unitPrice: 0,
      taxRate: 0,
    }
  ],
};

// Formulaire Facture
const initialInvoiceState = {
  clientId: '',
  subject: '',
  description: '',
  invoiceDate: new Date().toISOString().split('T')[0],
  dueDate: '',
  currency: 'FC',        // NOUVEAU
  taxLabel: 'TVA',       // NOUVEAU
  taxRate: 0,
  shippingCost: 0,
  discountPercentage: 0,
  paymentTerms: '',
  deliveryDetails: '',
  vatNumber: '',
  registrationNumber: '',
  companyBankDetails: '',
  companyAddress: '',
  companyPhone: '',
  companyEmail: '',
  internalReference: '',
  notes: '',
  terms: '',
  items: [
    {
      description: '',
      quantity: 1,
      unit: 'pièce',     // NOUVEAU
      unitPrice: 0,
      taxRate: 0,
    }
  ],
};
```

---

## 7. Récapitulatif des endpoints API

### Devis

| Méthode | URL | Description |
|---|---|---|
| `POST` | `/api/invoicing/quotes` | Créer un devis |
| `GET` | `/api/invoicing/quotes` | Lister les devis |
| `GET` | `/api/invoicing/quotes/:id` | Détail d'un devis |
| `PUT` | `/api/invoicing/quotes/:id` | Modifier un devis (DRAFT) |
| `DELETE` | `/api/invoicing/quotes/:id` | Supprimer un devis (DRAFT) |
| `POST` | `/api/invoicing/quotes/:id/mark-as-sent` | Marquer envoyé |
| `POST` | `/api/invoicing/quotes/:id/mark-as-accepted` | Marquer accepté |
| `POST` | `/api/invoicing/quotes/:id/mark-as-rejected` | Marquer rejeté |
| `POST` | `/api/invoicing/quotes/:id/convert-to-proforma` | Convertir en Proforma |

### Proforma

| Méthode | URL | Description |
|---|---|---|
| `POST` | `/api/invoicing/proforma-invoices` | Créer une proforma |
| `GET` | `/api/invoicing/proforma-invoices` | Lister les proformas |
| `GET` | `/api/invoicing/proforma-invoices/:id` | Détail d'une proforma |
| `PUT` | `/api/invoicing/proforma-invoices/:id` | Modifier une proforma (DRAFT) |
| `DELETE` | `/api/invoicing/proforma-invoices/:id` | Supprimer (DRAFT) |
| `POST` | `/api/invoicing/proforma-invoices/:id/confirm` | Confirmer |
| `POST` | `/api/invoicing/proforma-invoices/:id/record-payment` | Enregistrer un paiement |
| `GET` | `/api/invoicing/proforma-invoices/:id/payments` | Historique des paiements |
| `POST` | `/api/invoicing/proforma-invoices/:id/convert-to-invoice` | Convertir en Facture |

### Facture

| Méthode | URL | Description |
|---|---|---|
| `POST` | `/api/invoicing/invoices` | Créer une facture |
| `GET` | `/api/invoicing/invoices` | Lister les factures |
| `GET` | `/api/invoicing/invoices/summary` | Statistiques globales |
| `GET` | `/api/invoicing/invoices/:id` | Détail d'une facture |
| `PUT` | `/api/invoicing/invoices/:id` | Modifier (DRAFT) |
| `DELETE` | `/api/invoicing/invoices/:id` | Supprimer (DRAFT) |
| `POST` | `/api/invoicing/invoices/:id/mark-as-sent` | Marquer envoyée |
| `POST` | `/api/invoicing/invoices/:id/mark-as-viewed` | Marquer vue |
| `POST` | `/api/invoicing/invoices/:id/record-payment` | Enregistrer un paiement |
| `GET` | `/api/invoicing/invoices/:id/payments` | Historique des paiements |
| `GET` | `/api/invoicing/invoices/:id/audit-log` | Journal d'audit |

### Filtres disponibles (query params GET list)

```
GET /api/invoicing/invoices?page=1&limit=20&status=DRAFT&search=INV-2026&sortBy=createdAt&sortOrder=desc
GET /api/invoicing/invoices?isOverdue=true
```

---

## 8. Workflow complet Devis → Proforma → Facture

```
[DRAFT] → mark-as-sent → [SENT]
                           ↓
                    mark-as-accepted → [ACCEPTED]
                           ↓
                  convert-to-proforma → [CONVERTED]
                                           ↓
                                      [Proforma DRAFT]
                                           ↓ confirm
                                      [Proforma CONFIRMED]
                                           ↓ record-payment
                               [PARTIALLY_PAID] ou [PAID]
                                           ↓ convert-to-invoice
                                      [Facture DRAFT]
                                           ↓ mark-as-sent
                                      [Facture SENT]
                                           ↓ record-payment
                                  [PARTIALLY_PAID] ou [PAID]
```

---

## 9. Cas d'usage par secteur — Exemples de configuration

### Vente de parcelles
```json
{
  "currency": "USD",
  "taxLabel": "Taxe de mutation",
  "items": [{ "unit": "lot", "quantity": 1 }]
}
```

### Vente de véhicules
```json
{
  "currency": "USD",
  "taxLabel": "TVA",
  "items": [{ "unit": "véhicule", "quantity": 1 }]
}
```

### Entreprise minière
```json
{
  "currency": "USD",
  "taxLabel": "Redevance minière",
  "items": [{ "unit": "tonne", "quantity": 150.75 }]
}
```

### Prestataire de services
```json
{
  "currency": "FC",
  "taxLabel": "TVA",
  "items": [{ "unit": "heure", "quantity": 40.5 }]
}
```

### Commerce général
```json
{
  "currency": "FC",
  "taxLabel": "TVA",
  "items": [{ "unit": "pièce", "quantity": 10 }]
}
```

---

## 10. Checklist de mise à jour frontend

- [ ] Champ `quantity` : passer de `step="1"` à `step="any"` (accepter décimaux)
- [ ] Ajouter colonne **Unité** (`unit`) dans le tableau des lignes
- [ ] Ajouter sélecteur **Devise** (`currency`) dans le formulaire principal
- [ ] Ajouter champ **Libellé taxe** (`taxLabel`) dans le formulaire principal
- [ ] Mettre à jour `state` initial avec les nouveaux champs
- [ ] Mettre à jour les requêtes API (inclure `currency`, `taxLabel`, `unit`)
- [ ] Mettre à jour `formatCurrency()` pour gérer plusieurs devises
- [ ] Remplacer "TVA" codé en dur par `taxLabel` dans les vues
- [ ] Vérifier l'affichage de quantités décimales (ex: `2.5 tonne`)
- [ ] Tester le workflow complet : Devis → Proforma → Facture avec les nouveaux champs
- [ ] Vérifier que `currency` et `taxLabel` se propagent lors des conversions automatiques
