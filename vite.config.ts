import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // Génère un SW Workbox et l'enregistre via virtual:pwa-register
      registerType: 'prompt',
      injectRegister: null, // on gère l'enregistrement manuellement dans main.tsx

      includeAssets: [
        'offline.html',
        'LOGO_Mukapps.png',
        'LOGO_Mukapps2.png',
        'icons/icon-192x192.png',
        'icons/icon-512x512.png',
      ],

      manifest: {
        name: 'Mukapps - Système de Gestion de Vente',
        short_name: 'Mukapps',
        description: "Solution complète pour la gestion d'inventaire, de ventes et de facturation",
        theme_color: '#2563EB',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'any',
        scope: '/',
        start_url: '/login?source=pwa',
        lang: 'fr',
        categories: ['business', 'productivity', 'finance'],
        icons: [
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
        shortcuts: [
          {
            name: 'Tableau de bord',
            short_name: 'Dashboard',
            description: "Vue d'ensemble de votre business",
            url: '/dashboard',
            icons: [{ src: '/icons/icon-192x192.png', sizes: '96x96' }],
          },
        ],
      },

      workbox: {
        // Nettoie automatiquement les anciens caches Workbox entre déploiements
        cleanupOutdatedCaches: true,
        // Prend le contrôle de tous les onglets ouverts dès activation
        clientsClaim: true,
        // Active la nouvelle version sans attendre la fermeture des onglets
        skipWaiting: true,

        // Précache tous les assets buildés (hash dans le nom = toujours frais)
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,webmanifest}'],
        globIgnores: ['**/node_modules/**'],

        // kiosk.html est copié après le build par kioskHtmlPlugin.
        // On l'ajoute manuellement au précache Workbox pour le support hors ligne.
        additionalManifestEntries: [
          { url: '/kiosk.html', revision: null },
          { url: '/kiosk.webmanifest', revision: null },
        ],

        // Pas de navigateFallback global : /kiosk a son propre fallback,
        // le SPA principal aussi. On gère tout en runtimeCaching.
        navigateFallback: null,

        runtimeCaching: [
          // API : network-only avec fallback JSON hors ligne
          {
            urlPattern: /^https?:\/\/.*\/api\//,
            handler: 'NetworkOnly',
            options: {
              plugins: [
                {
                  fetchDidFail: async () => {
                    return new Response(JSON.stringify({ error: 'Hors ligne' }), {
                      status: 503,
                      headers: { 'Content-Type': 'application/json' },
                    });
                  },
                },
              ],
            },
          },
          // Navigation SPA : network-first, fallback offline.html uniquement hors ligne
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'navigation-cache',
              networkTimeoutSeconds: 5,
              plugins: [
                {
                  handlerDidError: async () => {
                    return (await caches.match('/offline.html')) as Response;
                  },
                },
              ],
            },
          },
          // Fonts Google
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Images distantes (ex: Pexels)
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: { maxEntries: 60, maxAgeSeconds: 30 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },

      devOptions: {
        enabled: false, // désactivé en dev pour éviter les conflits de cache
      },
    }),
  ],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    dedupe: ['react', 'react-dom'],
  },

  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
    // En dev, /kiosk est servi par kiosk.html
    fs: { allow: ['.'] },
  },

  build: {
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: (assetInfo) => {
          const ext = (assetInfo.name ?? '').split('.').pop() ?? '';
          if (/png|jpe?g|svg|gif|tiff|bmp|ico|webp/i.test(ext))
            return 'assets/images/[name].[hash][extname]';
          if (/css/i.test(ext)) return 'assets/css/[name].[hash][extname]';
          if (/woff2?|eot|ttf|otf/i.test(ext)) return 'assets/fonts/[name].[hash][extname]';
          return 'assets/[name].[hash][extname]';
        },
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['lucide-react', 'react-hot-toast'],
          'charts-vendor': ['recharts'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
    sourcemap: false,
    minify: 'terser',
    assetsDir: 'assets',
    emptyOutDir: true,
  },

  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'recharts'],
  },
});
