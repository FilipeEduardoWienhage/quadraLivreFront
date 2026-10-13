import type { Page } from '@playwright/test'
import { cartao, expect, test, toast } from './base'

const painel = (page: Page) => page.getByRole('complementary', { name: 'Agenda do dia' })

/** Abre o detalhe de um agendamento pela lista do dia. */
const abrirDetalhe = async (page: Page, texto: string | RegExp) => {
  await painel(page).getByRole('button', { name: texto }).click()
}

test.beforeEach(async ({ page }) => {
  await page.goto('/agenda')
  await expect(painel(page).getByRole('button')).toHaveCount(4)
})

test('remarcar locação: valor acompanha a tabela e a cobrança é atualizada', async ({ page }) => {
  await abrirDetalhe(page, /Locação/)
  await painel(page).getByRole('button', { name: 'Editar' }).click()

  const dialogo = page.getByRole('dialog', { name: 'Editar agendamento' })
  await expect(dialogo.getByLabel('Tipo')).toHaveValue('Locação')
  await dialogo.getByLabel('Início').fill('11:00')
  await dialogo.getByLabel('Fim').fill('12:30')
  // o valor era o da tabela: acompanha o novo horário (1h30 a R$ 80/h)
  await expect(dialogo.getByLabel('Valor')).toHaveValue('120')
  await dialogo.getByRole('button', { name: 'Salvar alterações' }).click()

  await expect(toast(page, 'Agendamento atualizado.')).toBeVisible()
  await expect(painel(page)).toContainText('11:00–12:30')
  await expect(cartao(page, 'Quadra 1').getByRole('button', { name: /11:00–12:30/ })).toBeVisible()

  await page.getByRole('link', { name: 'Financeiro' }).click()
  await expect(page.getByRole('row').filter({ hasText: 'Locação Quadra 1 — 12/10/2026 11:00–12:30' })).toContainText(
    'R$ 120,00',
  )
})

test('editar aula mantém a presença de quem já estava', async ({ page }) => {
  await abrirDetalhe(page, /Tênis/)
  await painel(page).getByLabel('Presença de Bruno Lima').selectOption({ label: 'Presente' })
  await expect(toast(page, 'Presença registrada.')).toBeVisible()

  await painel(page).getByRole('button', { name: 'Editar' }).click()
  const dialogo = page.getByRole('dialog', { name: 'Editar agendamento' })
  await expect(dialogo.getByLabel('Professor')).toHaveValue('1') // Carlos
  await dialogo.getByLabel('Incluir aluno').selectOption({ label: 'Ana Souza' })
  await dialogo.getByRole('button', { name: 'Salvar alterações' }).click()

  await expect(toast(page, 'Agendamento atualizado.')).toBeVisible()
  await expect(painel(page).getByLabel('Presença de Bruno Lima')).toHaveValue('PRESENTE')
  await expect(painel(page).getByLabel('Presença de Ana Souza')).toHaveValue('PENDENTE')
})

test('na edição, a própria aula não conta como cota estourada', async ({ page }) => {
  // Juliana: físico 1x por semana, e esta é a aula da semana
  await abrirDetalhe(page, /Treino físico/)
  await painel(page).getByRole('button', { name: 'Editar' }).click()
  const dialogo = page.getByRole('dialog', { name: 'Editar agendamento' })
  await expect(dialogo).toContainText('Físico 1x por semana · 1/1 nesta semana')
  await expect(dialogo).not.toContainText('cota esgotada')
})

test('remarcar encontro de turma para outra quadra e horário', async ({ page }) => {
  await abrirDetalhe(page, /Iniciante/)
  await painel(page).getByRole('button', { name: 'Remarcar' }).click()

  const dialogo = page.getByRole('dialog', { name: 'Remarcar encontro da turma' })
  await expect(dialogo).toContainText('Remarca só este encontro.')
  await dialogo.getByLabel('Local').selectOption({ label: 'Quadra 2' })
  await dialogo.getByLabel('Início').fill('19:00')
  await dialogo.getByLabel('Fim').fill('20:00')
  await dialogo.getByRole('button', { name: 'Salvar alterações' }).click()

  await expect(toast(page, 'Agendamento atualizado.')).toBeVisible()
  await expect(cartao(page, 'Quadra 2').getByRole('button', { name: /19:00–20:00/ })).toContainText('Turma')
  // o horário antigo não volta a aparecer, nem recarregando a página
  await page.reload()
  await expect(cartao(page, 'Quadra 1').getByRole('button', { name: /Iniciante/ })).toHaveCount(0)
})

test('locação já paga não muda de valor', async ({ page }) => {
  await page.getByRole('link', { name: 'Financeiro' }).click()
  await page.getByRole('row').filter({ hasText: 'Locação Quadra 1' }).getByRole('button', { name: 'Receber' }).click()
  await page.getByRole('dialog').getByLabel('Forma de pagamento').selectOption({ label: 'Pix' })
  await page.getByRole('dialog').getByRole('button', { name: 'Confirmar recebimento' }).click()
  await expect(toast(page, 'Recebimento registrado.')).toBeVisible()

  await page.getByRole('link', { name: 'Agenda' }).click()
  await abrirDetalhe(page, /Locação/)
  await painel(page).getByRole('button', { name: 'Editar' }).click()
  const dialogo = page.getByRole('dialog', { name: 'Editar agendamento' })
  await dialogo.getByLabel('Valor').fill('60')
  await dialogo.getByRole('button', { name: 'Salvar alterações' }).click()

  await expect(toast(page, 'já foi paga')).toBeVisible()
  await expect(dialogo).toBeVisible()
})
