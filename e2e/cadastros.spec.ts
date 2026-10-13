import { cartao, expect, test, toast } from './base'

test('pessoas: busca sem acento e situação no feminino', async ({ page }) => {
  await page.goto('/pessoas')
  const busca = page.getByLabel('Buscar por nome, e-mail, telefone ou CPF')

  await busca.fill('julia')
  await expect(page.getByRole('row')).toHaveCount(2)
  await expect(page.getByRole('row').nth(1)).toContainText('Juliana Rocha')
  await expect(page.getByRole('row').nth(1)).toContainText('Ativa')

  await busca.fill('ninguém')
  await expect(page.getByText('Nenhuma pessoa corresponde aos filtros.')).toBeVisible()
})

test('pessoa pode ser aluna e professora; nível só aparece para aluno', async ({ page }) => {
  await page.goto('/pessoas')
  await page.getByRole('button', { name: 'Nova pessoa' }).click()
  const dialogo = page.getByRole('dialog')

  await dialogo.getByLabel('Nome').fill('Paula Nunes')
  await expect(dialogo.getByLabel('Nível')).toBeVisible()
  await dialogo.getByLabel('Aluno').uncheck()
  await expect(dialogo.getByLabel('Nível')).toHaveCount(0)
  await dialogo.getByLabel('Aluno').check()
  await dialogo.getByLabel('Professor').check()
  await dialogo.getByRole('button', { name: 'Salvar' }).click()

  await expect(toast(page, 'Pessoa cadastrada.')).toBeVisible()
  const linha = page.getByRole('row').filter({ hasText: 'Paula Nunes' })
  await expect(linha).toContainText('Aluno')
  await expect(linha).toContainText('Professor')
})

test('quadra nova com tabela de preço aparece na agenda', async ({ page }) => {
  await page.goto('/quadras')
  await page.getByRole('button', { name: 'Nova quadra' }).click()
  const dialogo = page.getByRole('dialog')
  await dialogo.getByLabel('Nome').fill('Quadra 4')

  // sem faixa de preço, quadra alugável não é aceita
  await dialogo.getByRole('button', { name: 'Salvar' }).click()
  await expect(toast(page, 'Informe ao menos uma faixa de preço.')).toBeVisible()

  await dialogo.getByRole('button', { name: 'Adicionar faixa' }).click()
  await dialogo.getByLabel('Valor (R$)').fill('100')
  await dialogo.getByRole('button', { name: 'Salvar' }).click()
  await expect(toast(page, 'Quadra cadastrada.')).toBeVisible()
  await expect(page.getByRole('row').filter({ hasText: 'Quadra 4' })).toContainText('R$ 100,00/h')

  await page.getByRole('link', { name: 'Agenda' }).click()
  await expect(cartao(page, 'Quadra 4')).toContainText('Livre agora')
})

test('contrato mensal: encerrar com valor do último mês definido pelo gestor', async ({ page }) => {
  await page.goto('/contratos')
  await page.getByRole('row').filter({ hasText: 'Ana Souza' }).getByRole('button', { name: 'Encerrar' }).click()
  const dialogo = page.getByRole('dialog')
  await dialogo.getByLabel(/Cobrança do último mês/).selectOption({ label: 'Proporcional' })
  await expect(dialogo.getByLabel('Valor integral do mês')).toHaveValue('R$ 380,00')
  const valor = dialogo.getByLabel('Valor a cobrar')
  await expect(valor).toHaveValue('147.1') // sugestão: 12 de 31 dias
  await valor.fill('150')
  await dialogo.getByRole('button', { name: 'Encerrar contrato' }).click()
  await expect(toast(page, 'Contrato encerrado.')).toBeVisible()

  await page.goto('/financeiro')
  await expect(page.getByRole('row').filter({ hasText: 'Ana Souza' })).toContainText('R$ 150,00')
})
