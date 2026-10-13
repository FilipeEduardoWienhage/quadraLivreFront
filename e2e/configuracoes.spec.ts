import type { Page } from '@playwright/test'
import { cartao, expect, test, toast } from './base'

const irParaDia = async (page: Page, data: string) => {
  await page.getByRole('link', { name: 'Agenda' }).click()
  await page.getByLabel('Data', { exact: true }).fill(data)
}

test('fechar o domingo reflete na agenda', async ({ page }) => {
  await page.goto('/configuracoes')
  const domingo = page.locator('.horario-semana-dia').filter({ hasText: 'Domingo' })
  await domingo.getByLabel('Aberto').uncheck()
  await expect(domingo.getByLabel('Abertura de Domingo')).toBeDisabled()
  await page.getByRole('button', { name: 'Salvar horário' }).click()
  await expect(toast(page, 'Horário de funcionamento salvo.')).toBeVisible()

  await irParaDia(page, '2026-10-18')
  await expect(page.getByText('Academia fechada neste dia.')).toBeVisible()
  await expect(page.getByRole('region')).toHaveCount(0)
})

test('fechamento antes da abertura é recusado', async ({ page }) => {
  await page.goto('/configuracoes')
  await page.getByLabel('Fechamento de Segunda').fill('06:00')
  await page.getByRole('button', { name: 'Salvar horário' }).click()
  await expect(toast(page, 'Segunda: o fechamento deve ser depois da abertura.')).toBeVisible()
})

test('feriado com horário especial limita a agenda do dia', async ({ page }) => {
  await page.goto('/configuracoes')
  await page.getByRole('button', { name: 'Novo feriado' }).click()
  const dialogo = page.getByRole('dialog')
  await dialogo.getByLabel('Nome').fill('Ponto facultativo')
  // "Data" também aparece em "Repete todo ano nesta data": busca o campo pelo papel e início do nome
  await dialogo.getByRole('textbox', { name: /^Data/ }).fill('2026-10-19')
  await dialogo.getByLabel('A academia abre neste dia').check()
  await expect(dialogo.getByLabel('Abertura')).toHaveValue('08:00')
  await dialogo.getByRole('button', { name: 'Salvar' }).click()
  await expect(toast(page, 'Feriado cadastrado.')).toBeVisible()
  await expect(page.getByRole('row').filter({ hasText: 'Ponto facultativo' })).toContainText('Das 08:00 às 14:00')

  await irParaDia(page, '2026-10-19')
  await expect(page.getByText('Feriado: Ponto facultativo. Horário especial das 08:00 às 14:00.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Agendar Quadra 1 às 13:30' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Agendar Quadra 1 às 14:00' })).toHaveCount(0)
  // a turma de segunda às 18h não acontece nesse dia
  await expect(cartao(page, 'Quadra 1')).toContainText('Nenhum agendamento')
})

test('feriado fechado (Natal, todo ano) fecha a agenda em qualquer ano', async ({ page }) => {
  await page.goto('/agenda')
  await page.getByLabel('Data', { exact: true }).fill('2027-12-25')
  await expect(page.getByText('Academia fechada neste dia (Natal).')).toBeVisible()
})
