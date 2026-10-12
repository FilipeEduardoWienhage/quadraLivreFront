import { defineConfig } from '@playwright/test'

/**
 * Testes de ponta a ponta: as telas no navegador, como o usuário usa.
 * Localmente usa o Chrome instalado (sem baixar navegadores); no CI, rode antes
 * `npx playwright install chromium` e defina PW_CHANNEL=chromium.
 */
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // no CI: anotações no próprio GitHub + relatório HTML (enviado como artefato quando falha)
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  // o mock simula latência de rede; com os testes em paralelo, a 1ª carga pode passar de 5s
  expect: { timeout: 10_000 },
  use: {
    baseURL: 'http://localhost:5173',
    channel: process.env.PW_CHANNEL ?? 'chrome',
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    // aproveita o `npm run dev` que já estiver aberto
    reuseExistingServer: !process.env.CI,
  },
})
