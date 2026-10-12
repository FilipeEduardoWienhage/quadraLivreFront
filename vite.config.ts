/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    // testes unitários ficam junto do código; os de ponta a ponta (e2e/) rodam pelo Playwright
    include: ['src/**/*.test.ts'],
    setupFiles: ['src/testes/preparacao.ts'],
  },
})
