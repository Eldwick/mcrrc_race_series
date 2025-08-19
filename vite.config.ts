import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // @ts-expect-error - Vite types don't include test config, but vitest extends them at runtime
  test: {
    environment: 'node',
    exclude: ['**/node_modules/**', '**/dist/**', 'scripts/**'],
    globals: true,
    setupFiles: []
  },
  // Include HTML files as assets to prevent import analysis
  assetsInclude: ['**/*.html'],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path
      }
    }
  }
})
