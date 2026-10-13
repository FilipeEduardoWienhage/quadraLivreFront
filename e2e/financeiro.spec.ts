import type { Page } from '@playwright/test'
import { expect, test, toast } from './base'

const indicador = (page: Page, rotulo: string) =>
  page.locator('.cartao-resumo').filter({ hasText: rotulo })

test.beforeEach(async ({ page }) => {
  await page.goto('/financeiro')
  await expect(page.getByRole('row').filter({ hasText: 'Ana Souza' })).toBeVisible()
})

test('indicadores do topo', async ({ page }) => {
  // em aberto: mensalidade da Ana (vencida em 10/10), raquete do Marcos e locação do Marcos (vence hoje)
  await expect(indicador(page, 'A receber')).toContainText('R$ 490,00')
  await expect(indicador(page, 'A receber')).toContainText('3 cobranças')
  await expect(indicador(page, 'Em atraso')).toContainText('R$ 380,00')
  await expect(indicador(page, 'Recebido no mês')).toContainText('R$ 1.090,00')
  await expect(indicador(page, 'A pagar')).toContainText('R$ 640,00')
})

test('a lista abre nas pendentes, com a vencida destacada', async ({ page }) => {
  await expect(page.getByRole('row').filter({ hasText: 'Ana Souza' })).toContainText('Vencida')
  // a do Marcos de hoje ainda não venceu
  await expect(page.getByRole('row').filter({ hasText: 'Locação Quadra 1' })).toContainText('Em aberto')
  await expect(page.getByRole('row').filter({ hasText: 'Aluguel do imóvel' })).toHaveCount(0) // já paga
})

test('busca sem acento e por item', async ({ page }) => {
  await page.getByLabel('Buscar por pessoa, categoria ou item').fill('raquete')
  await expect(page.getByRole('row')).toHaveCount(2) // cabeçalho + 1
  await expect(page.getByRole('row').nth(1)).toContainText('Marcos Pereira')
})

test('receber uma cobrança', async ({ page }) => {
  await page.getByRole('row').filter({ hasText: 'Aluguel de raquete' }).getByRole('button', { name: 'Receber' }).click()
  const dialogo = page.getByRole('dialog')
  await dialogo.getByLabel('Forma de pagamento').selectOption({ label: 'Pix' })
  await dialogo.getByRole('button', { name: 'Confirmar recebimento' }).click()

  await expect(toast(page, 'Recebimento registrado.')).toBeVisible()
  await expect(page.getByRole('row').filter({ hasText: 'Aluguel de raquete' })).toHaveCount(0)
  await expect(indicador(page, 'Recebido no mês')).toContainText('R$ 1.120,00')
})

test('cancelar exige motivo', async ({ page }) => {
  await page.getByRole('row').filter({ hasText: 'Aluguel de raquete' }).getByRole('button', { name: 'Cancelar' }).click()
  const dialogo = page.getByRole('dialog')
  await dialogo.getByLabel('Motivo').fill('lançado por engano')
  await dialogo.getByRole('button', { name: 'Cancelar transação' }).click()

  await expect(toast(page, 'Transação cancelada.')).toBeVisible()
  await page.getByLabel('Filtrar por situação').selectOption({ label: 'Canceladas' })
  await expect(page.getByRole('row').filter({ hasText: 'Aluguel de raquete' })).toBeVisible()
})

test('gerar mensalidades do mês seguinte, sem duplicar', async ({ page }) => {
  const gerar = async () => {
    await page.getByRole('button', { name: 'Gerar mensalidades' }).click()
    await page.getByRole('dialog').getByLabel('Mês de referência').fill('2026-11')
    await page.getByRole('dialog').getByRole('button', { name: 'Gerar' }).click()
  }
  await gerar()
  await expect(toast(page, '2 mensalidades geradas para 11/2026.')).toBeVisible()
  await gerar()
  await expect(toast(page, 'Nenhuma mensalidade nova para 11/2026')).toBeVisible()
})

test('lançar despesa', async ({ page }) => {
  await page.getByRole('button', { name: 'Nova despesa' }).click()
  const dialogo = page.getByRole('dialog')
  await dialogo.getByLabel('Descrição').fill('Troca de rede da Quadra 2')
  await dialogo.getByLabel('Categoria').selectOption({ label: 'Manutenção' })
  await dialogo.getByLabel('Valor').fill('350')
  await dialogo.getByLabel('Vencimento').fill('2026-10-20')
  await dialogo.getByRole('button', { name: 'Lançar despesa' }).click()

  await expect(toast(page, 'Despesa lançada.')).toBeVisible()
  await expect(page.getByRole('row').filter({ hasText: 'Troca de rede' })).toContainText('Despesa')
  await expect(indicador(page, 'A pagar')).toContainText('R$ 990,00')
})

test('devolução parcial de uma receita paga vira conta a pagar', async ({ page }) => {
  await page.getByLabel('Filtrar por situação').selectOption({ label: 'Pagas' })
  await page.getByRole('row').filter({ hasText: 'Pacote 10 aulas' }).getByRole('button', { name: 'Devolver' }).click()
  const dialogo = page.getByRole('dialog')
  await expect(dialogo.getByLabel('Valor a devolver')).toHaveValue('1100')
  await dialogo.getByLabel('Valor a devolver').fill('300')
  await dialogo.getByLabel('Motivo').fill('aulas não usadas')
  await dialogo.getByRole('button', { name: 'Registrar devolução' }).click()

  await expect(toast(page, 'Devolução registrada em contas a pagar.')).toBeVisible()
  await expect(indicador(page, 'A pagar')).toContainText('R$ 940,00')
  await page.getByLabel('Filtrar por situação').selectOption({ label: 'Pendentes (em aberto e vencidas)' })
  await expect(page.getByRole('row').filter({ hasText: 'Devolução — Pacote 10 aulas' })).toContainText('Devolução —')
})
