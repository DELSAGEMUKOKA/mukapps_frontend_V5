import DOMPurify from 'dompurify';

/** Sanitise une chaîne HTML pour neutraliser tout contenu XSS. */
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'div', 'span', 'p', 'br', 'strong', 'b', 'em', 'i', 'u',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
      'ul', 'ol', 'li',
      'img', 'a', 'hr',
    ],
    ALLOWED_ATTR: ['style', 'class', 'src', 'alt', 'href', 'width', 'height', 'colspan', 'rowspan', 'cellpadding', 'cellspacing', 'align', 'valign'],
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'button'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur', 'onchange', 'javascript'],
  });
}

/** Échappe les caractères HTML spéciaux dans un texte brut (anti-XSS pour du texte affiché dans du HTML). */
export function escapeHtml(text: string | undefined | null): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/** Décode le payload d'un JWT sans le valider cryptographiquement (côté client uniquement). */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

/** Vérifie si un JWT est expiré (vérification côté client uniquement, pas cryptographique). */
export function isJwtExpired(token: string | null): boolean {
  if (!token) return true;
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== 'number') return true;
  // Buffer de 30 secondes pour éviter les races conditions
  return Date.now() >= (payload.exp - 30) * 1000;
}

/** Extrait le rôle du JWT sans appel réseau. */
export function getRoleFromJwt(token: string | null): string | null {
  if (!token) return null;
  const payload = decodeJwtPayload(token);
  return (payload?.role as string) ?? null;
}

/** Valide le format d'un UUID v4. */
export function isValidUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

/** Valide le format d'un ID numérique. */
export function isValidNumericId(id: string): boolean {
  return /^\d+$/.test(id) && parseInt(id, 10) > 0;
}
