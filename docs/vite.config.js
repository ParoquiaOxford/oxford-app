import { defineConfig } from 'vite'
import { copyFileSync, cpSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const copyPublicDataPlugin = () => ({
  name: 'copy-public-data-only',
  closeBundle() {
    const publicDataDir = resolve(__dirname, 'public', 'data')
    const outDataDir = resolve(__dirname, 'dist', 'data')

    if (existsSync(publicDataDir)) {
      mkdirSync(outDataDir, { recursive: true })
      cpSync(publicDataDir, outDataDir, { recursive: true, force: true })
    }

    const noJekyllFrom = resolve(__dirname, 'public', '.nojekyll')
    const noJekyllTo = resolve(__dirname, 'dist', '.nojekyll')
    if (existsSync(noJekyllFrom)) {
      copyFileSync(noJekyllFrom, noJekyllTo)
    }
  },
})

export default defineConfig({
  base: './',
  plugins: [copyPublicDataPlugin()],
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    copyPublicDir: false,
    rollupOptions: {
      input: {
        main: './index.html',
        signin: './signin.html',
        dashboard: './dashboard.html',
        settings: './settings.html',
      },
    },
  },
})
