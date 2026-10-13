import type { Page } from '@playwright/test'
import { expect, test, toast } from './base'

const indicador = (page: Page, rotulo: string) => page.locator('.cartao-resumo').filter({ hasText: rotulo })
const pendencias = (page: Page) => page.getByRole('region', { name: 'Precisa de atenção' })
const agendaDeHoje = (page: Page) => page.getByRole('region', { name: 'Agora e a seguir' })

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await expect(pendencias(page)).toBeVisible()
})

test('é a página inicial, com o dia e o dinheiro do mês', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Bom dia!' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Painel' })).toHaveClass(/active/)
  await expect(indicador(page, 'Em atraso')).toContainText('R$ 380,00')
  await expect(indicador(page, 'Recebido no mês')).toContainText('R$ 1.090,00')
  await expect(indicador(page, 'Recebido no mês')).toContainText('de R$ 1.580,00 previstos')
})

test('agora e a seguir: a aula das 10h está acontecendo; as das 8h já passaram', async ({ page }) => {
  const agenda = agendaDeHoje(page)
  await expect(agenda.getByRole('link', { name: /^10:00–11:00/ })).toBeVisible()
  await expect(agenda.getByRole('link', { name: /^08:00/ })).toHaveCount(0)
  await expect(agenda.getByText('Quadras livres hoje')).toBeVisible()
})

test('receber uma cobrança vencida direto do painel', async ({ page }) => {
  await pendencias(page).getByRole('listitem').filter({ hasText: 'Ana Souza' }).getByRole('button', { name: 'Receber' }).click()
  const dialogo = page.getByRole('dialog')
  await dialogo.getByLabel('Forma de pagamento').selectOption({ label: 'Pix' })
  await dialogo.getByRole('button', { name: 'Confirmar recebimento' }).click()

  await expect(toast(page, 'Recebimento registrado.')).toBeVisible()
  await expect(indicador(page, 'Em atraso')).toContainText('R$ 0,00')
  await expect(pendencias(page).getByText('Cobranças vencidas')).toHaveCount(0)
})

test('presença não registrada abre a aula na agenda', async ({ page }) => {
  // aula de físico das 8h, já terminada
  const aula = pendencias(page).getByRole('listitem').filter({ hasText: '12/10/2026 08:00' })
  await aula.getByRole('link', { name: 'Registrar' }).click()

  await expect(page).toHaveURL(/\/agenda\?data=2026-10-12&agendamento=2$/)
  await expect(page.getByRole('complementary', { name: 'Agenda do dia' }).getByLabel('Presença de Juliana Rocha')).toBeVisible()
})
