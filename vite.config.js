import crypto from 'node:crypto'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { build as viteBuild, defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const PRECACHE_EXTENSIONS = new Set(['.css', '.ico', '.js', '.json', '.png', '.svg', '.woff2'])
const PRECACHE_MAX_BYTES = 2 * 1024 * 1024

function resolveOutDir(config) {
  const outDir = config.build.outDir || 'dist'
  return path.isAbsolute(outDir) ? outDir : path.resolve(config.root, outDir)
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MiB`
}

function toUrlPath(filePath) {
  return filePath.split(path.sep).join('/')
}

async function listFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules') continue
      files.push(...await listFiles(fullPath))
    } else if (entry.isFile()) {
      files.push(fullPath)
    }
  }

  return files
}

async function createPrecacheManifest(outDir) {
  const files = await listFiles(outDir)
  const manifestEntries = []
  const warnings = []
  let size = 0

  for (const filePath of files) {
    const relativePath = toUrlPath(path.relative(outDir, filePath))
    if (relativePath === 'sw.js') continue
    if (relativePath !== 'index.html' && !PRECACHE_EXTENSIONS.has(path.extname(relativePath))) continue

    const file = await fs.readFile(filePath)
    if (file.byteLength > PRECACHE_MAX_BYTES) {
      warnings.push(`${relativePath} is ${formatBytes(file.byteLength)} and will not be precached.`)
      continue
    }

    manifestEntries.push({
      url: relativePath,
      revision: crypto.createHash('md5').update(file).digest('hex'),
    })
    size += file.byteLength
  }

  manifestEntries.sort((a, b) => a.url.localeCompare(b.url))
  return { count: manifestEntries.length, manifestEntries, size, warnings }
}

function zenteroPwa() {
  let config

  return {
    name: 'zentero-pwa',
    apply: 'build',
    configResolved(resolvedConfig) {
      config = resolvedConfig
    },
    async closeBundle() {
      if (config.build.ssr) return

      const outDir = resolveOutDir(config)
      const swSrc = path.resolve(config.root, 'src/sw.js')
      const swDest = path.resolve(outDir, 'sw.js')

      await viteBuild({
        root: config.root,
        base: config.base,
        mode: config.mode,
        publicDir: false,
        configFile: false,
        define: {
          ...config.define,
          'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
        },
        build: {
          minify: config.build.minify,
          sourcemap: false,
          outDir,
          emptyOutDir: false,
          lib: {
            entry: swSrc,
            name: 'app',
            formats: ['iife'],
          },
          rollupOptions: {
            output: {
              entryFileNames: 'sw.js',
            },
          },
        },
      })

      const { count, manifestEntries, size, warnings } = await createPrecacheManifest(outDir)

      const swFile = await fs.readFile(swDest, 'utf8')
      const injectionPoint = 'self.__WB_MANIFEST'
      if (!swFile.includes(injectionPoint)) {
        throw new Error(`Service worker precache injection point not found: ${injectionPoint}`)
      }

      await fs.writeFile(swDest, swFile.replace(injectionPoint, JSON.stringify(manifestEntries)), 'utf8')

      for (const warning of warnings) {
        this.warn(warning)
      }
      this.info(`PWA precache manifest: ${count} files, ${formatBytes(size)}`)
    },
  }
}

export default defineConfig({
  plugins: [
    react(),
    zenteroPwa(),
  ],
})
