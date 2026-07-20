// vite.config.js - Version complète avec PWA et offline
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg', 'offline.html', 'LOGO_Mukapps.png', 'LOGO_Mukapps2.png'],
      manifest: {
        name: 'Mukapps - Système de Gestion des des entreprises',
        short_name: 'Mukapps',
        description: 'Solution complète pour la gestion \'des entreprises',
        theme_color: '#3B82F6',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'any',
        scope: '/',
        start_url: '/login?source=pwa',
        lang: 'fr',
        categories: ['business', 'productivity', 'finance'],
        icons: [
          {
            src: '/LOGO_Mukapps.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/LOGO_Mukapps.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ],
        shortcuts: [
          {
            name: 'Point de Vente',
            short_name: 'POS',
            description: 'Accès rapide au point de vente',
            url: '/app/pos',
            icons: [{ src: '/LOGO_Mukapps.png', sizes: '96x96' }]
          },
          {
            name: 'Tableau de bord',
            short_name: 'Dashboard',
            description: 'Vue d\'ensemble de votre business',
            url: '/app/dashboard',
            icons: [{ src: '/LOGO_Mukapps.png', sizes: '96x96' }]
          },
          {
            name: 'Produits',
            short_name: 'Produits',
            description: 'Gestion de l\'inventaire',
            url: '/app/products',
            icons: [{ src: '/LOGO_Mukapps.png', sizes: '96x96' }]
          }
        ]
      },
      workbox: {
        // ✅ Nettoie l'ancien cache
        cleanupOutdatedCaches: true,
        // ✅ Prend le contrôle immédiatement
        clientsClaim: true,
        // ✅ Active la nouvelle version directement
        skipWaiting: true,
        
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        globIgnores: ['**/node_modules/**', '**/sw.js'],
        
        // ✅ Page offline personnalisée
        navigateFallback: '/offline.html',
        navigateFallbackDenylist: [/^\/api/, /^\/admin/, /^\/auth/],
        
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 30 * 24 * 60 * 60
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      },
      devOptions: {
        enabled: true,
        type: 'module',
        suppressWarnings: true
      }
    })
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
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  },
  build: {
    rollupOptions: {
      output: {
        // Cache-busting avec hash
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name?.split('.') || [];
          const ext = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico|webp/i.test(ext || '')) {
            return `assets/images/[name].[hash][extname]`;
          }
          if (/css/i.test(ext || '')) {
            return `assets/css/[name].[hash][extname]`;
          }
          if (/woff2?|eot|ttf|otf/i.test(ext || '')) {
            return `assets/fonts/[name].[hash][extname]`;
          }
          return `assets/[name].[hash][extname]`;
        },
        // Version minimaliste des chunks
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['lucide-react', 'react-hot-toast'],
          'charts-vendor': ['recharts']
        }
      }
    },
    chunkSizeWarningLimit: 1000,
    sourcemap: false,
    minify: 'terser',
    assetsDir: 'assets',
    emptyOutDir: true
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'recharts']
  }
});