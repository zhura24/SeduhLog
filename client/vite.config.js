import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import pkg from './package.json';

export default defineConfig({
  plugins: [react(), VitePWA({
    registerType: 'prompt',
    includeAssets: ['logo.svg', 'favicon.svg', 'favicon.ico', 'apple-touch-icon-180x180.png'],
    manifest: {
      name: 'SeduhLog', short_name: 'SeduhLog',
      description: 'Jurnal seduh kopi dan cupping notes pribadi',
      lang: 'id', start_url: '/', scope: '/', display: 'standalone',
      orientation: 'portrait', background_color: '#F4F0E7', theme_color: '#174A3D',
      icons: [
        { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
        { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
        { src: '/maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
      ],
      shortcuts: [
        { name: 'Mulai Timer', url: '/timer', icons: [{ src: '/pwa-192x192.png', sizes: '192x192' }] },
        { name: 'Tambah Seduhan', url: '/brews/new', icons: [{ src: '/pwa-192x192.png', sizes: '192x192' }] }
      ]
    },
    workbox: {
      navigateFallback: '/index.html',
      globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
      runtimeCaching: [
        { urlPattern: ({ url }) => url.pathname.startsWith('/api/') && url.pathname !== '/api/health', handler: 'NetworkFirst', options: { cacheName: 'seduhlog-api', networkTimeoutSeconds: 4, expiration: { maxEntries: 100, maxAgeSeconds: 604800 }, cacheableResponse: { statuses: [0, 200] } } },
        { urlPattern: /^https:\/\/.+\.(?:png|jpg|jpeg|webp|avif|gif|svg)(?:\?.*)?$/i, handler: 'StaleWhileRevalidate', options: { cacheName: 'seduhlog-images', expiration: { maxEntries: 60, maxAgeSeconds: 2592000 } } }
      ]
    },
    devOptions: { enabled: false }
  })],
  define: { __APP_VERSION__: JSON.stringify(pkg.version) }
});
