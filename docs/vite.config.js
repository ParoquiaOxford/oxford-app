import { defineConfig } from 'vite'

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: false,
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
