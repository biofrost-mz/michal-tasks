import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      // Don't inject a <link rel="manifest"> — index.html has its own
      manifest: false,
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      injectManifest: {
        // Keep the app shell fresh without forcing every lazy page chunk into the SW precache.
        globPatterns: ['index.html', '**/*.{css,svg,json,ico,png,woff2}'],
      },
    }),
  ],
  build: {
    modulePreload: {
      resolveDependencies(_filename, deps) {
        return deps.filter((dep) => !dep.includes('vendor-notes-editor'))
      },
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (
            id.includes('@blocknote') ||
            id.includes('@tiptap') ||
            id.includes('prosemirror') ||
            id.includes('@mantine')
          ) {
            return 'vendor-notes-editor'
          }
          return undefined
        },
      },
    },
  },
})
