import { defineConfig } from 'vite'
import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      // The installable app lives under /app/ now (the root is the marketing landing page).
      scope: '/app/',
      manifest: {
        name: 'Hey Girl — Wedding Planning',
        short_name: 'Hey Girl',
        description: 'Plan your wedding with Hey Girl, your AI planning bestie.',
        theme_color: '#b5838d',
        background_color: '#fff7f4',
        display: 'standalone',
        scope: '/app/',
        start_url: '/app/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      }
    })
  ],
  build: {
    rollupOptions: {
      input: {
        // Two pages: the landing page (root) and the React app (/app/).
        main: resolve(__dirname, 'index.html'),
        app: resolve(__dirname, 'app/index.html'),
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8787'
    }
  }
})
