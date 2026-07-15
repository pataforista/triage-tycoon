import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: { enabled: true },
      manifest: {
        name: 'Triage Tycoon',
        short_name: 'Triage',
        description: 'Juego educativo de triaje en urgencias psiquiátricas',
        theme_color: '#14b8a6',
        icons: [] // We'll keep it simple for now as SVG data uris in manifest aren't widely supported by all browsers
      }
    })
  ]
})
