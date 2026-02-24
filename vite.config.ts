import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  server: { 
    hmr: { overlay: false }, // Disable noisy overlay, errors still in console
    proxy: {
      '/api': {
        target: 'https://racingsystemsanalysis.com',
        changeOrigin: true,
        secure: true,
      },
    },
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
  optimizeDeps: { 
    exclude: ['installHook.js'],
    esbuildOptions: {
      sourcemap: false, // Disable source maps in dep optimization to avoid linked sourcemap errors
    }
  },
  plugins: [
    react(),
    VitePWA({
      // selfDestroying generates a SW that unregisters itself and clears caches.
      // This is needed to clean up stale SWs cached by the CDN with immutable headers.
      // Re-enable normal PWA mode once CDN cache headers are fixed.
      selfDestroying: true,
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
    })
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts'
  }
});
