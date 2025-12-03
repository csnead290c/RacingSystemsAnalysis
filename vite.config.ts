import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  server: { 
    hmr: { overlay: false }, // Disable noisy overlay, errors still in console
  },
  build: { 
    sourcemap: true,
    rollupOptions: {
      onwarn(warning, warn) {
        // Silence known external sourcemap noise
        if (warning.code === 'SOURCEMAP_ERROR') return;
        if (/installHook\.js\.map/.test(warning.message ?? '')) return;
        warn(warning);
      },
    },
  },
  // silence source-map parse noise from worker devtools helper
  optimizeDeps: { exclude: ['installHook.js'] },
  esbuild: {
    sourcemap: 'linked', // avoid inlined data URLs that confuse devtools on certain extensions
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico'],
      manifest: {
        name: 'Racing Systems Analysis',
        short_name: 'RSA',
        description: 'Racing Systems Analysis Application',
        theme_color: '#ffffff',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts'
  }
});
