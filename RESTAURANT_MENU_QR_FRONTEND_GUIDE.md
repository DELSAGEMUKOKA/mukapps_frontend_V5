# Guide Frontend — QR Code Menu Restaurant/Bar

## Vue d'ensemble

La fonctionnalité permet à l'admin/superviseur de générer un QR code que les clients scannent avec leur smartphone pour consulter le menu directement dans leur navigateur, sans avoir à télécharger d'application.

**Flux :**
1. L'admin génère le QR code depuis le backoffice
2. Il l'imprime ou l'affiche (table, entrée, comptoir)
3. Le client scanne → page HTML responsive s'ouvre dans son navigateur

---

## Routes disponibles

### Routes protégées (backoffice)

Base URL : `/api/restaurant/menu-qr`

Toutes ces routes nécessitent :
- Header `Authorization: Bearer <token>`
- Rôle `ADMIN` ou `SUPERVISOR`

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/api/restaurant/menu-qr/generate` | Génère le QR code (retourne image base64 + URL) |
| `GET` | `/api/restaurant/menu-qr/download` | Télécharge le QR code en fichier PNG |

### Routes publiques (clients)

Aucune authentification requise.

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/public/menu/:companyId` | Page HTML du menu (rendue par le serveur) |
| `GET` | `/public/menu/:companyId/json` | Données JSON du menu |

---

## Détail des endpoints

### 1. Générer le QR code

```
GET /api/restaurant/menu-qr/generate
Authorization: Bearer <token>
```

**Réponse 200 :**
```json
{
  "success": true,
  "message": "QR code généré avec succès",
  "data": {
    "menuUrl": "https://votre-domaine.com/public/menu/cmp_abc123",
    "qrCodeDataUrl": "data:image/png;base64,iVBORw0KGgoAAAANS...",
    "company": {
      "id": "cmp_abc123",
      "name": "Le Bon Coin"
    }
  }
}
```

**Utilisation dans le frontend :**

```jsx
// Afficher le QR code dans une balise <img>
<img src={data.qrCodeDataUrl} alt="QR Code Menu" />

// Afficher l'URL pour la copier
<input value={data.menuUrl} readOnly />
```

---

### 2. Télécharger le QR code en PNG

```
GET /api/restaurant/menu-qr/download
Authorization: Bearer <token>
```

**Réponse :** Fichier binaire PNG avec header `Content-Disposition: attachment; filename="menu-qrcode-<companyId>.png"`

**Implémentation du bouton de téléchargement :**

```js
async function downloadQrCode(authToken) {
  const response = await fetch('/api/restaurant/menu-qr/download', {
    headers: { Authorization: `Bearer ${authToken}` },
  });

  if (!response.ok) throw new Error('Erreur téléchargement');

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = 'menu-qrcode.png';
  a.click();

  URL.revokeObjectURL(url);
}
```

---

### 3. Menu public JSON (optionnel)

```
GET /public/menu/:companyId/json
```

Utile si vous souhaitez construire votre propre page menu côté frontend plutôt qu'utiliser la page HTML servie par l'API.

**Réponse 200 :**
```json
{
  "success": true,
  "message": "Menu récupéré avec succès",
  "data": {
    "company": {
      "id": "cmp_abc123",
      "name": "Le Bon Coin"
    },
    "categories": [
      {
        "id": "cat_001",
        "name": "Entrées",
        "description": null,
        "color": "#e74c3c",
        "icon": "🥗",
        "sortOrder": 1,
        "station": "CUISINE",
        "items": [
          {
            "id": "item_001",
            "name": "Salade César",
            "description": "Laitue, croûtons, parmesan, sauce césar maison",
            "price": 4500,
            "imageUrl": "https://...",
            "tags": ["végétarien"],
            "preparationTime": 10
          }
        ]
      }
    ]
  }
}
```

**Notes importantes :**
- Seules les catégories avec `isActive: true` sont retournées
- Seuls les items avec `isActive: true` ET `isAvailable: true` sont retournés
- Les prix sont en **entiers** (centimes ou devise locale — XAF dans ce projet)
- `imageUrl` peut être `null`
- `tags` est un tableau de chaînes, peut être vide `[]`
- `preparationTime` est en minutes, peut être `null`

---

## Composant suggéré — Page QR Code (backoffice)

Voici la structure recommandée pour la page backoffice de gestion du QR code menu :

```
┌─────────────────────────────────────────────┐
│  QR Code Menu                               │
│                                             │
│  ┌──────────────────┐  ┌─────────────────┐  │
│  │                  │  │ URL du menu :   │  │
│  │   [QR CODE IMG]  │  │ https://...     │  │
│  │                  │  │ [Copier]        │  │
│  └──────────────────┘  │                 │  │
│                         │ [Télécharger   │  │
│                         │  en PNG]       │  │
│                         │                │  │
│                         │ [Prévisualiser │  │
│                         │  le menu]      │  │
│                         └─────────────────┘  │
└─────────────────────────────────────────────┘
```

**Exemple React complet :**

```jsx
import { useState, useEffect } from 'react';

export default function MenuQrPage() {
  const [qrData, setQrData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const token = useAuthToken(); // votre hook d'auth

  useEffect(() => {
    loadQrCode();
  }, []);

  async function loadQrCode() {
    setLoading(true);
    try {
      const res = await fetch('/api/restaurant/menu-qr/generate', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) setQrData(json.data);
    } finally {
      setLoading(false);
    }
  }

  async function handleDownload() {
    const res = await fetch('/api/restaurant/menu-qr/download', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'menu-qrcode.png';
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(qrData.menuUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) return <div>Génération du QR code...</div>;
  if (!qrData) return null;

  return (
    <div>
      <h1>QR Code Menu</h1>

      <img
        src={qrData.qrCodeDataUrl}
        alt="QR Code Menu"
        width={200}
        height={200}
      />

      <div>
        <label>Lien du menu :</label>
        <input value={qrData.menuUrl} readOnly />
        <button onClick={handleCopy}>
          {copied ? 'Copié !' : 'Copier le lien'}
        </button>
      </div>

      <button onClick={handleDownload}>
        Télécharger en PNG
      </button>

      <a href={qrData.menuUrl} target="_blank" rel="noopener noreferrer">
        Prévisualiser le menu
      </a>
    </div>
  );
}
```

---

## Comportement de la page menu publique

La route `GET /public/menu/:companyId` retourne directement une **page HTML complète** rendue côté serveur. Elle est :

- **Responsive** — optimisée mobile (c'est la cible principale)
- **Sans authentification** — accessible par n'importe quel navigateur
- **Sticky header** avec le nom du restaurant
- **Navigation par catégorie** scrollable horizontalement
- **Carte par item** avec photo (si disponible), description, tags, prix, temps de préparation

Vous n'avez **rien à implémenter** pour cette page — elle est servie directement par l'API. Le QR code encode l'URL de cette page.

Si vous souhaitez une page menu personnalisée à votre charte graphique, utilisez l'endpoint JSON `/public/menu/:companyId/json` à la place.

---

## Gestion des erreurs

| Code HTTP | Cause | Action |
|-----------|-------|--------|
| `401` | Token manquant ou expiré | Rediriger vers la connexion |
| `403` | Rôle insuffisant (ni ADMIN ni SUPERVISOR) | Afficher un message "Accès refusé" |
| `404` | `companyId` invalide (route publique) | Afficher "Menu non disponible" |
| `500` | Erreur serveur | Afficher un message d'erreur générique |

---

## Variable d'environnement à configurer

Le domaine encodé dans le QR code est contrôlé par la variable `APP_BASE_URL` côté serveur.

Demandez au backend de vérifier que cette variable est bien définie avec l'URL de production :
```
APP_BASE_URL=https://votre-domaine.com
```

Si elle n'est pas définie, les QR codes générés pointeront vers `http://localhost:3000`, ce qui ne fonctionnera qu'en développement local.

---

## Points d'attention

1. **Le QR code est toujours à jour** — il pointe vers une URL dynamique, pas une image statique. Si le menu change, les clients qui scannent voient les nouvelles données immédiatement.

2. **Le QR code ne change pas** — l'URL `/public/menu/:companyId` est stable. Il n'est pas nécessaire de régénérer le QR code si le menu est modifié.

3. **Impression** — recommandez à l'admin de télécharger le PNG (400x400px) pour une impression de qualité. Pour l'affichage écran, le `dataUrl` base64 suffit.

4. **Pas de mise en cache agressive** — la page menu reflète l'état actuel de la base de données en temps réel.
