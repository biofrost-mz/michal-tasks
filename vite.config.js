import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Don't inject a <link rel="manifest"> — index.html has its own
      manifest: false,
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      injectManifest: {
        // Precache all Vite build outputs (hashed JS, CSS, HTML, SVG, JSON)
        globPatterns: ['**/*.{js,css,html,svg,json,ico,png,woff2}'],
      },
    }),
  ],
})
