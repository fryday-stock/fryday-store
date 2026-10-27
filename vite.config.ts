import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// الموقع ينشر على https://fryday-stock.github.io/fryday-store/
export default defineConfig({
  base: '/fryday-store/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['logo.png', 'favicon.png', 'apple-touch-icon.png'],
      manifest: {
        id: '/fryday-store/',
        name: 'مخزن مطعم فرايدي',
        short_name: 'مخزن فرايدي',
        description: 'نظام مخزن مطعم فرايدي',
        lang: 'ar',
        dir: 'rtl',
        start_url: '/fryday-store/',
        scope: '/fryday-store/',
        display: 'standalone',
        orientation: 'any',
        background_color: '#ffffff',
        theme_color: '#0ba5e9',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // كل ملفات الموقع تنخزن حتى يفتح بدون إنترنت (البيانات يخزنها Firestore بنفسه)
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
        navigateFallback: 'index.html',
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
    }),
  ],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  build: { chunkSizeWarningLimit: 1500 },
})
