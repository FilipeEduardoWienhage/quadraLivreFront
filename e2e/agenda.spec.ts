import { cartao, expect, test, toast } from './base'

test.beforeEach(async ({ page }) => {
  await page.goto('/agenda')
  await expect(page.getByRole('complementary', { name: 'Agenda do dia' }).getByRole('button')).toHaveCount(4)
})

test('cards mostram o estado de cada espaço agora (10:00)', async ({ page }) => {
  await expect(cartao(page, 'Quadra 2')).toContainText('Em uso até 11:00')
  await expect(cartao(page, 'Quadra 1')).toContainText('Livre agora')
  await expect(cartao(page, 'Quadra 3')).toContainText('Em manutenção')
  // horário que já passou não oferece agendamento
  await expect(page.getByRole('button', { name: 'Agendar Quadra 1 às 09:00' })).toHaveCount(0)
})

test('agendar locação pelo horário livre, com horário quebrado e valor da tabela', async ({ page }) => {
  await page.getByRole('button', { name: 'Agendar Quadra 2 às 14:00' }).click()
  const dialogo = page.getByRole('dialog')
  await expect(dialogo.getByLabel('Início')).toHaveValue('14:00')

  await dialogo.getByLabel('Fim').fill('15:22')
  await dialogo.getByLabel('Responsável').selectOption({ label: 'Ana Souza' })
  // 82 minutos a R$ 80/h
  await expect(dialogo.getByLabel('Valor')).toHaveValue('109.33')
  await expect(dialogo).toContainText('Aluno com contrato ativo: desconto a seu critério.')

  // desconto negociado
  await dialogo.getByLabel('Valor').fill('90')
  await expect(dialogo).toContainText('Tabela: R$ 109,33.')
  await dialogo.getByRole('button', { name: 'Agendar' }).click()

  await expect(toast(page, 'Locação agendada e cobrança lançada.')).toBeVisible()
  await expect(cartao(page, 'Quadra 2').getByRole('button', { name: /14:00–15:22/ })).toBeVisible()
  await expect(page.getByRole('complementary', { name: 'Agenda do dia' }).getByRole('button')).toHaveCount(5)
})

test('aula mostra o contrato e a cota de cada aluno', async ({ page }) => {
  await page.getByRole('button', { name: 'Novo agendamento' }).click()
  const dialogo = page.getByRole('dialog')
  await dialogo.getByLabel('Tipo').selectOption({ label: 'Aula' })
  await dialogo.getByLabel('Local').selectOption({ label: 'Sala de treino físico' })
  await dialogo.getByLabel('Início').fill('16:00')
  await dialogo.getByLabel('Fim').fill('17:00')
  await dialogo.getByLabel('Modalidade').selectOption({ label: 'Treino físico' })
  await dialogo.getByLabel('Professor').selectOption({ label: 'Rafael Costa' })
  await dialogo.getByLabel('Incluir aluno').selectOption({ label: 'Juliana Rocha' })
  await dialogo.getByLabel('Incluir aluno').selectOption({ label: 'Bruno Lima' })

  await expect(dialogo).toContainText('Físico 1x por semana · 1/1 nesta semana — cota esgotada')
  await expect(dialogo).toContainText('Sem contrato nesta modalidade: cobre como aula avulsa no Financeiro.')
  // cota esgotada avisa, mas não impede: a decisão é do gestor
  await dialogo.getByRole('button', { name: 'Agendar' }).click()
  await expect(toast(page, 'Aula agendada.')).toBeVisible()
  await expect(cartao(page, 'Sala de treino físico').getByRole('button', { name: /16:00–17:00/ })).toContainText('Aula')
})

test('conflito de horário é recusado com mensagem clara', async ({ page }) => {
  await page.getByRole('button', { name: 'Novo agendamento' }).click()
  const dialogo = page.getByRole('dialog')
  await dialogo.getByLabel('Local').selectOption({ label: 'Quadra 2' })
  await dialogo.getByLabel('Início').fill('10:30')
  await dialogo.getByLabel('Fim').fill('11:30')
  await dialogo.getByLabel('Responsável').selectOption({ label: 'Marcos Pereira' })
  await dialogo.getByRole('button', { name: 'Agendar' }).click()

  await expect(toast(page, 'Já existe agendamento em Quadra 2 das 10:00 às 11:00.')).toBeVisible()
  await expect(dialogo).toBeVisible()
})

test('cancelar locação exige motivo e cancela a cobrança', async ({ page }) => {
  await page.getByRole('complementary', { name: 'Agenda do dia' }).getByRole('button', { name: /Locação/ }).click()
  await page.getByRole('button', { name: 'Cancelar agendamento' }).click()

  const dialogo = page.getByRole('dialog')
  await expect(dialogo).toContainText('A cobrança em aberto desta locação também será cancelada.')
  await dialogo.getByRole('button', { name: 'Cancelar agendamento' }).click()
  await expect(dialogo).toBeVisible() // motivo obrigatório

  await dialogo.getByLabel('Motivo').fill('cliente desistiu')
  await dialogo.getByRole('button', { name: 'Cancelar agendamento' }).click()
  await expect(toast(page, 'Agendamento cancelado.')).toBeVisible()
  await expect(page.getByRole('complementary', { name: 'Agenda do dia' })).toContainText('cliente desistiu')
  await expect(cartao(page, 'Quadra 1').getByRole('button', { name: /Locação/ })).toHaveCount(0)
})

test('filtros por atividade e por espaço', async ({ page }) => {
  const atividade = page.getByLabel('Filtrar por atividade')
  const espaco = page.getByLabel('Filtrar por espaço')

  await atividade.selectOption({ label: 'Treino físico' })
  await expect(page.getByRole('region')).toHaveCount(1)
  await expect(cartao(page, 'Sala de treino físico')).toBeVisible()

  await atividade.selectOption({ label: 'Locações e reservas' })
  await expect(page.getByRole('region')).toHaveCount(1)
  await expect(cartao(page, 'Quadra 1')).toBeVisible()

  // filtro de espaço mostra o card mesmo vazio
  await atividade.selectOption({ label: 'Todas as atividades' })
  await espaco.selectOption({ label: 'Churrasqueira' })
  await expect(page.getByRole('region')).toHaveCount(1)
  await expect(cartao(page, 'Churrasqueira')).toContainText('Nenhum agendamento')

  await espaco.selectOption({ label: 'Todas as quadras' })
  await expect(page.getByRole('region')).toHaveCount(3)
})

test('turma e aula levam selo; cores da legenda são editáveis', async ({ page }) => {
  await expect(cartao(page, 'Quadra 1').getByRole('button', { name: /Iniciante/ })).toContainText('Turma')
  await expect(cartao(page, 'Quadra 2').getByRole('button', { name: /Tênis/ })).toContainText('Aula')

  const corDe = (espaco: string, texto: RegExp) =>
    cartao(page, espaco)
      .getByRole('button', { name: texto })
      .evaluate((bloco) => getComputedStyle(bloco).getPropertyValue('--cor').trim())

  expect(await corDe('Quadra 2', /Tênis/)).not.toBe(await corDe('Sala de treino físico', /Treino físico/))

  await page.getByRole('button', { name: 'Editar cores' }).click()
  await page.getByRole('dialog').getByLabel('Treino físico').fill('#7c3aed')
  await page.getByRole('dialog').getByRole('button', { name: 'Salvar' }).click()
  await expect(toast(page, 'Cores atualizadas.')).toBeVisible()
  await expect.poll(() => corDe('Sala de treino físico', /Treino físico/)).toBe('#7c3aed')
})
