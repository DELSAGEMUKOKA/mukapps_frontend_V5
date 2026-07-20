# Guide Frontend — Système d'abonnement SaaS + MaxiCash + Alertes

Ce guide couvre l'intégration complète côté frontend du système d'abonnement de Mukapps :
souscription via MaxiCash, gestion des packs, et système d'alerte d'expiration.

---

## 1. Vue d'ensemble

Le flux complet est le suivant :

```
1. L'admin consulte les plans disponibles  →  GET /api/subscription/plans
2. Il choisit un plan + des packs          →  POST /api/maxicash/pay
3. Le backend renvoie une redirectUrl      →  Rediriger le navigateur vers MaxiCash
4. Le client paie sur MaxiCash
5. MaxiCash rappelle le backend (webhook)  →  L'abonnement s'active automatiquement
6. Le frontend redirige vers /subscription/success ou /subscription/failure
7. À chaque chargement, vérifier l'alerte →  GET /api/subscription/alert
```

---

## 2. Authentification

Toutes les routes (sauf les callbacks MaxiCash) requièrent un header JWT :

```http
Authorization: Bearer <token>
```

---

## 3. Plans et packs disponibles

### Récupérer les plans

```http
GET /api/subscription/plans
```

**Réponse :**

```json
{
  "success": true,
  "data": {
    "plans": [
      {
        "plan": "BASIC",
        "prices": { "monthly": 12, "annual": 110 },
        "packLimit": 1,
        "description": "1 pack métier au choix"
      },
      {
        "plan": "PREMIUM",
        "prices": { "monthly": 25, "annual": 230 },
        "packLimit": 3,
        "description": "Jusqu'à 3 packs métier"
      },
      {
        "plan": "ENTERPRISE",
        "prices": { "monthly": 100, "annual": 960 },
        "packLimit": null,
        "description": "Tous les packs sans limite"
      }
    ],
    "packs": [
      {
        "name": "commerce",
        "displayName": "Pack Commerce",
        "description": "Produits, stock, ventes, clients, rapports et facturation",
        "modules": ["magasin", "product", "category", "client", "vente", "reporting", "invoicing", "stock"]
      },
      {
        "name": "restaurant",
        "displayName": "Pack Restaurant",
        "description": "Gestion complète de restaurant : commandes, cuisine, facturation",
        "modules": ["restaurant"]
      },
      {
        "name": "hotel",
        "displayName": "Pack Hôtellerie",
        "description": "Réservations, chambres, check-in/out, housekeeping, facturation",
        "modules": ["hotel"]
      },
      {
        "name": "rh",
        "displayName": "Pack Ressources Humaines",
        "description": "Employés, présences, congés, paie, kiosque QR",
        "modules": ["rh"]
      },
      {
        "name": "school",
        "displayName": "Pack École",
        "description": "Inscriptions, paiements, bulletins, emplois du temps, présences",
        "modules": ["school"]
      },
      {
        "name": "logistics",
        "displayName": "Pack Logistique",
        "description": "Dossiers, transport, douanes, entrepôts, flotte, tarifs",
        "modules": ["logistics"]
      }
    ]
  }
}
```

**Règle d'affichage :** désactiver la sélection de packs en excès selon `packLimit`.
Si `packLimit === null` → illimité (ENTERPRISE / FREE trial).

---

## 4. Initier un paiement MaxiCash

### Route principale (recommandée)

```http
POST /api/maxicash/pay
Authorization: Bearer <token>
Content-Type: application/json

{
  "plan": "PREMIUM",
  "packNames": ["commerce", "restaurant"],
  "billingCycle": "monthly",
  "telephone": "+243812345678"
}
```

| Champ | Type | Obligatoire | Valeurs |
|---|---|---|---|
| `plan` | string | oui | `BASIC`, `PREMIUM`, `ENTERPRISE` |
| `packNames` | string[] | oui | Tableau de noms de packs (voir section 3) |
| `billingCycle` | string | non | `monthly` (défaut) ou `annual` |
| `telephone` | string | non | Numéro de téléphone MaxiCash du client |

**Réponse :**

```json
{
  "success": true,
  "data": {
    "paymentId": "clxxxxxxxxxxxxx",
    "plan": "PREMIUM",
    "packNames": ["commerce", "restaurant"],
    "amount": 25,
    "currency": "USD",
    "redirectUrl": "https://api.maxicashapp.com/payentryweb?logid=ABC123",
    "logId": "ABC123"
  },
  "message": "Paiement initié — redirigez le client vers redirectUrl"
}
```

**Action frontend :** rediriger le navigateur vers `redirectUrl`.

```js
window.location.href = data.redirectUrl;
// ou dans un nouvel onglet :
window.open(data.redirectUrl, '_blank');
```

### Route alternative (formulaire POST)

Utiliser uniquement si la route `/pay` ne fonctionne pas (réseau restreint).

```http
POST /api/maxicash/form
Authorization: Bearer <token>
Content-Type: application/json

{ "plan": "BASIC", "packNames": ["rh"], "billingCycle": "annual" }
```

**Réponse :**

```json
{
  "success": true,
  "data": {
    "paymentId": "clxxxxxxxxxxxxx",
    "action": "https://api.maxicashapp.com/PayEntryPost",
    "fields": {
      "PayType": "MaxiCash",
      "Amount": "14400",
      "Currency": "maxiDollar",
      "MerchantID": "...",
      "Reference": "clxxxxxxxxxxxxx",
      "accepturl": "https://app.mondomaine.com/subscription/success?paymentId=...",
      "cancelurl": "...",
      "declineurl": "...",
      "notifyurl": "..."
    }
  }
}
```

Le frontend doit soumettre un formulaire HTML invisible avec ces champs vers `action`.

```js
function submitMaxiCashForm({ action, fields }) {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = action;
  Object.entries(fields).forEach(([name, value]) => {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = value;
    form.appendChild(input);
  });
  document.body.appendChild(form);
  form.submit();
}
```

---

## 5. Pages de retour MaxiCash

MaxiCash redirige le navigateur vers ces URLs après paiement. Il faut créer ces pages :

| URL | Description |
|---|---|
| `/subscription/success?paymentId=xxx` | Paiement réussi |
| `/subscription/failure?paymentId=xxx` | Paiement refusé |
| `/subscription/cancel?paymentId=xxx` | Paiement annulé par le client |

### Page success

La vraie confirmation vient du webhook backend (automatique), donc il suffit
d'afficher un message de succès et de rafraîchir les infos d'abonnement.

```js
// /subscription/success
const params = new URLSearchParams(window.location.search);
const paymentId = params.get('paymentId');

// Attendre 2s que le webhook ait le temps d'être traité, puis recharger
setTimeout(async () => {
  const info = await api.get('/subscription');
  // Mettre à jour le store global avec les nouvelles infos
  updateSubscription(info.data);
  router.push('/dashboard');
}, 2000);
```

### Page failure / cancel

Afficher un message d'erreur avec un bouton "Réessayer" qui renvoie vers la page
de souscription.

---

## 6. Vérifier l'abonnement actuel

```http
GET /api/subscription
Authorization: Bearer <token>
```

**Réponse :**

```json
{
  "success": true,
  "data": {
    "company": { "id": "...", "name": "Ma Société" },
    "subscription": {
      "status": "ACTIVE",
      "plan": "PREMIUM",
      "isValid": true,
      "trialEndsAt": null,
      "subscriptionEndsAt": "2026-08-08T00:00:00.000Z",
      "daysRemaining": 31,
      "createdAt": "2026-01-01T00:00:00.000Z"
    },
    "packs": {
      "active": ["commerce", "restaurant"],
      "count": 2,
      "limit": 3,
      "available": 1
    }
  }
}
```

---

## 7. Système d'alerte d'expiration

### Endpoint

```http
GET /api/subscription/alert
Authorization: Bearer <token>
```

**Réponse :**

```json
{
  "success": true,
  "data": {
    "progress": 82,
    "daysRemaining": 18,
    "status": "warning",
    "showWarning": true,
    "message": "Votre abonnement expirera bientôt. Pensez à le renouveler."
  }
}
```

### Valeurs possibles

| `status` | `progress` | `showWarning` | Description |
|---|---|---|---|
| `active` | 0–79 | `false` | Tout va bien, aucune alerte |
| `warning` | 80–89 | `true` | Bannière d'avertissement |
| `critical` | 90–99 | `true` | Alerte rouge urgente |
| `expired` | 100 | `true` | Abonnement expiré — accès bloqué |

### Quand appeler cet endpoint

- Au chargement du layout principal (après connexion)
- Toutes les heures si l'app reste ouverte longtemps (polling léger)

---

## 8. Implémentation de la bannière d'alerte

### Composant React/Vue — Logique

```jsx
// Exemple React
function SubscriptionAlert() {
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    api.get('/subscription/alert').then(res => setAlert(res.data.data));
  }, []);

  if (!alert?.showWarning) return null;

  return (
    <AlertBanner
      status={alert.status}      // 'warning' | 'critical' | 'expired'
      message={alert.message}
      progress={alert.progress}
      daysRemaining={alert.daysRemaining}
    />
  );
}
```

### Couleurs et styles selon le statut

| `status` | Couleur fond | Couleur texte | Icône |
|---|---|---|---|
| `warning` | `#FFF3CD` (jaune clair) | `#856404` | Avertissement |
| `critical` | `#FFE0E0` (rouge clair) | `#C0392B` | Danger |
| `expired` | `#F8D7DA` (rouge) | `#842029` | Bloqué |

### Barre de progression

```jsx
function ProgressBar({ progress, status }) {
  const colors = {
    active: '#28A745',
    warning: '#FFC107',
    critical: '#DC3545',
    expired: '#6C757D',
  };

  return (
    <div style={{ width: '100%', backgroundColor: '#e9ecef', borderRadius: 4, height: 8 }}>
      <div style={{
        width: `${progress}%`,
        backgroundColor: colors[status],
        height: '100%',
        borderRadius: 4,
        transition: 'width 0.3s ease',
      }} />
    </div>
  );
}
```

### Exemple de bannière complète

```jsx
function AlertBanner({ status, message, progress, daysRemaining }) {
  const styles = {
    warning:  { bg: '#FFF3CD', text: '#856404', border: '#FFECB5' },
    critical: { bg: '#FFE0E0', text: '#C0392B', border: '#F5C2C7' },
    expired:  { bg: '#F8D7DA', text: '#842029', border: '#F5C2C7' },
  };
  const s = styles[status];

  return (
    <div style={{
      background: s.bg,
      color: s.text,
      border: `1px solid ${s.border}`,
      borderRadius: 8,
      padding: '12px 16px',
      marginBottom: 16,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>{message}</span>
        <RenewButton status={status} />
      </div>
      <ProgressBar progress={progress} status={status} />
      {daysRemaining !== null && (
        <small style={{ marginTop: 4, display: 'block' }}>
          {daysRemaining} jour(s) restant(s)
        </small>
      )}
    </div>
  );
}
```

---

## 9. Bouton "Renouveler"

Le bouton redirige vers la page de souscription ou, si l'abonnement est actif,
déclenche directement un nouveau paiement MaxiCash.

```jsx
function RenewButton({ status }) {
  const router = useRouter(); // ou useNavigate() en React Router

  const handleRenew = () => {
    router.push('/subscription/renew');
  };

  return (
    <button
      onClick={handleRenew}
      style={{
        background: status === 'expired' ? '#DC3545' : '#0D6EFD',
        color: 'white',
        border: 'none',
        borderRadius: 6,
        padding: '8px 16px',
        cursor: 'pointer',
        fontWeight: 600,
        whiteSpace: 'nowrap',
        marginLeft: 12,
      }}
    >
      {status === 'expired' ? 'Réactiver' : 'Renouveler'}
    </button>
  );
}
```

### Page /subscription/renew

Sur cette page, l'admin choisit un plan et des packs puis soumet vers `POST /api/maxicash/pay`.
Récupérer d'abord l'abonnement actuel pour pré-sélectionner le plan en cours.

```js
// Renouveler avec le même plan et les mêmes packs
async function renewCurrent() {
  const current = await api.get('/subscription');
  const { plan } = current.data.data.subscription;
  const activePacks = current.data.data.packs.active;

  const result = await api.post('/maxicash/pay', {
    plan,
    packNames: activePacks,
    billingCycle: 'monthly',
  });

  window.location.href = result.data.data.redirectUrl;
}
```

---

## 10. Historique des paiements

```http
GET /api/subscription/payment/history
Authorization: Bearer <token>
```

**Réponse :**

```json
{
  "success": true,
  "data": [
    {
      "id": "clxxxxxxxxxxxxx",
      "plan": "PREMIUM",
      "packNames": ["commerce", "restaurant"],
      "amount": 25,
      "currency": "USD",
      "billingCycle": "monthly",
      "status": "CONFIRMED",
      "maxicashRef": "MC-XXXXX",
      "paidAt": "2026-07-08T10:30:00.000Z",
      "periodStart": "2026-07-08T10:30:00.000Z",
      "periodEnd": "2026-08-08T10:30:00.000Z",
      "createdAt": "2026-07-08T10:25:00.000Z"
    }
  ]
}
```

| `status` | Signification |
|---|---|
| `PENDING` | Paiement initié, en attente de confirmation |
| `CONFIRMED` | Paiement confirmé, abonnement actif |
| `FAILED` | Paiement refusé |

---

## 11. Packs actifs

```http
GET /api/subscription/packs
Authorization: Bearer <token>
```

**Réponse :**

```json
{
  "success": true,
  "data": [
    {
      "packName": "commerce",
      "displayName": "Pack Commerce",
      "modules": ["magasin", "product", "category", "client", "vente", "reporting", "invoicing", "stock"],
      "activatedAt": "2026-07-08T10:30:00.000Z",
      "expiresAt": "2026-08-08T10:30:00.000Z"
    }
  ]
}
```

Utiliser cette liste pour afficher/masquer les modules dans la navigation.

---

## 12. Résumé des routes utilisées

| Méthode | Route | Auth | Rôle minimum | Usage |
|---|---|---|---|---|
| GET | `/api/subscription` | oui | tout rôle | Infos abonnement complet |
| GET | `/api/subscription/status` | oui | tout rôle | Vérification rapide validité |
| GET | `/api/subscription/plans` | oui | tout rôle | Liste plans et packs |
| GET | `/api/subscription/alert` | oui | tout rôle | Alerte expiration |
| GET | `/api/subscription/packs` | oui | tout rôle | Packs actifs |
| GET | `/api/subscription/payment/history` | oui | tout rôle | Historique paiements |
| POST | `/api/maxicash/pay` | oui | ADMIN | Initier paiement (redirect) |
| POST | `/api/maxicash/form` | oui | ADMIN | Initier paiement (formulaire) |

---

## 13. Gestion des erreurs courantes

| Code HTTP | Cause | Action frontend |
|---|---|---|
| 400 | Plan invalide ou pack invalide | Afficher le message d'erreur retourné |
| 400 | Nombre de packs dépasse la limite du plan | Afficher "Passez à un plan supérieur" |
| 403 | Abonnement expiré ou inactif | Rediriger vers `/subscription/renew` |
| 403 | Rôle insuffisant (pas ADMIN) | Masquer le bouton de paiement |
| 500 | MaxiCash injoignable | Afficher "Service temporairement indisponible" |

**Format d'erreur standard :**

```json
{
  "success": false,
  "error": "Message d'erreur lisible"
}
```

---

## 14. Recommandations UX

- **Appeler `/api/subscription/alert` au chargement** de chaque page du dashboard.
- **Ne pas bloquer l'interface** tant que `status !== 'expired'`. Laisser l'utilisateur travailler avec la bannière visible.
- **Pour `status === 'expired'`**, afficher une page de blocage avec uniquement le bouton de renouvellement et le contact support.
- **Pré-remplir** le formulaire de renouvellement avec le plan et les packs en cours pour simplifier la reconduction.
- **Afficher le statut TRIAL** différemment (badge "Essai gratuit" + jours restants) pour inciter à souscrire.
