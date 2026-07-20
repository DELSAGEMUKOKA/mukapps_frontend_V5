#!/usr/bin/env node
// Génère dist/kiosk.html à partir de dist/index.html après le build Vite+VitePWA.
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const indexPath = resolve(__dirname, '../dist/index.html');
const destPath = resolve(__dirname, '../dist/kiosk.html');

if (!existsSync(indexPath)) {
  console.error('[kiosk] dist/index.html introuvable — lancez npm run build d\'abord');
  process.exit(1);
}

let html = readFileSync(indexPath, 'utf8');

// Remplace le manifest principal par le manifest kiosque
html = html.replace(
  /(<link[^>]+rel="manifest"[^>]+href=")[^"]*(")/,
  '$1/kiosk.webmanifest$2'
);
// Titre dédié borne
html = html.replace(/<title>[^<]*<\/title>/, '<title>Borne de Pointage - MukApps</title>');
// Couleur de thème foncée pour le mode kiosque
html = html.replace(
  /(<meta[^>]+name="theme-color"[^>]+content=")[^"]*(")/,
  '$1#0F172A$2'
);
// Injecte un marqueur sessionStorage pour que l'app détecte le mode kiosk PWA
// et redirige automatiquement vers /kiosk au démarrage
html = html.replace(
  '</body>',
  `<script>
    sessionStorage.setItem('kiosk-pwa','1');
    document.documentElement.style.overflow='hidden';
    document.body.style.overflow='hidden';
  </script>\n</body>`
);

writeFileSync(destPath, html, 'utf8');
console.log('[kiosk] dist/kiosk.html généré avec succès');
