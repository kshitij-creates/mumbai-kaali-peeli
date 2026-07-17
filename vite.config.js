import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons.svg'], 
      manifest: {
        name: 'Sharing Finder',
        short_name: 'SharingFinder',
        // UPDATED DESCRIPTION: 
        description: 'The ultimate commuter map for sharing autos and taxis across Mumbai, Thane, Kalyan, and beyond.',
        theme_color: '#111111', 
        background_color: '#0a0a0a', 
        display: 'standalone', 
        orientation: 'portrait',
        icons: [
          {
            src: '/taxi.svg', 
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          },
          {
            src: '/taxi.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
})