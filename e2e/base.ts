import { test as baseTest, expect, type Page } from '@playwright/test'

/**
 * "Agora" fixo nos testes de ponta a ponta: segunda-feira, 12/10/2026, 10:00 em Brasília —
 * o mesmo dia dos dados mock. Cada teste roda num navegador limpo (sem localStorage),
 * então começa sempre dos dados de exemplo.
 */
const AGORA = new Date('2026-10-12T10:00:00-03:00')

export const test = baseTest.extend({
  page: async ({ page }, usar) => {
    await page.clock.setFixedTime(AGORA)
    await usar(page)
  },
})

export { expect }

/** Mensagem de toast (sucesso, erro ou aviso). */
export const toast = (page: Page, texto: string) => page.locator('.toast').filter({ hasText: texto })

/** Card de um espaço na agenda. */
export const cartao = (page: Page, espaco: string) => page.getByRole('region', { name: espaco })
