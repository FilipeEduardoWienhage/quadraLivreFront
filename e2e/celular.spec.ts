import { cartao, expect, test } from './base'

// tela de um celular comum
test.use({ viewport: { width: 390, height: 844 } })

const PAGINAS = ['agenda', 'pessoas', 'turmas', 'planos', 'contratos', 'quadras', 'financeiro', 'configuracoes']

test('no desktop não há botão de fechar menu', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/agenda')
  await expect(page.getByRole('navigation', { name: 'Menu principal' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Fechar menu' })).toBeHidden()
})

test('nenhuma página rola para o lado', async ({ page }) => {
  for (const pagina of PAGINAS) {
    await page.goto(`/${pagina}`)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    const largura = await page.evaluate(() => document.documentElement.scrollWidth)
    expect(largura, `/${pagina}`).toBeLessThanOrEqual(390)
  }
})

test('menu fica recolhido, abre pelo ☰ e fecha pelo ✕', async ({ page }) => {
  await page.goto('/agenda')
  const menu = page.getByRole('navigation', { name: 'Menu principal' })
  const abrir = page.getByRole('button', { name: 'Abrir menu' })
  const fechar = page.getByRole('button', { name: 'Fechar menu' })
  await expect(menu).toBeHidden()

  await abrir.click()
  await expect(menu).toBeVisible()
  await expect(fechar).toBeFocused() // o foco entra no menu

  await fechar.click()
  await expect(menu).toBeHidden()
  await expect(abrir).toBeFocused() // e volta para quem abriu

  await abrir.click()
  await menu.getByRole('link', { name: 'Financeiro' }).click()

  await expect(page.getByRole('heading', { name: 'Financeiro' })).toBeVisible()
  await expect(menu).toBeHidden() // fecha ao navegar
})

test('tocar num bloco da agenda leva ao detalhe', async ({ page }) => {
  await page.goto('/agenda')
  await cartao(page, 'Quadra 2').getByRole('button', { name: /Tênis/ }).click()

  const detalhe = page.getByRole('complementary', { name: 'Agenda do dia' })
  await expect(detalhe.getByRole('button', { name: 'Editar' })).toBeInViewport()
})

test('tabela vira cartões com o nome de cada coluna', async ({ page }) => {
  await page.goto('/pessoas')
  const juliana = page.getByRole('row').filter({ hasText: 'Juliana Rocha' })
  const telefone = juliana.locator('td[data-titulo="Telefone"]')
  // o nome da coluna aparece antes do valor (pseudo-elemento ::before)
  expect(await telefone.evaluate((td) => getComputedStyle(td, '::before').content)).toBe('"Telefone"')
  await expect(juliana.getByRole('button', { name: 'Editar' })).toBeInViewport({ ratio: 0.5 })
})

test('modal ocupa a tela, com os botões ao alcance', async ({ page }) => {
  await page.goto('/financeiro')
  await page.getByRole('button', { name: 'Nova despesa' }).click()
  const dialogo = page.getByRole('dialog')
  const caixa = await dialogo.boundingBox()
  expect(caixa?.width).toBe(390)
  await expect(dialogo.getByRole('button', { name: 'Lançar despesa' })).toBeInViewport()
})
