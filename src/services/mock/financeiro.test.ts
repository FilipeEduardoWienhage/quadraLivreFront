import { beforeEach, describe, expect, it } from 'vitest'
import { novoServidor } from '../../testes/servidor'

let api: Awaited<ReturnType<typeof novoServidor>>

beforeEach(async () => {
  api = await novoServidor()
})

const ultima = async () => (await api.transacoesApi.listar()).at(-1)!

describe('gerarMensalidades', () => {
  it('não duplica: 10/2026 já está nos dados de exemplo; 11/2026 gera uma vez só', async () => {
    expect(await api.transacoesApi.gerarMensalidades('2026-10')).toBe(0)
    expect(await api.transacoesApi.gerarMensalidades('2026-11')).toBe(2)
    expect(await api.transacoesApi.gerarMensalidades('2026-11')).toBe(0)
  })

  it('contrato combinado vira uma cobrança com um item por plano, no dia de vencimento', async () => {
    await api.transacoesApi.gerarMensalidades('2026-11')
    const juliana = (await api.transacoesApi.listar()).find(
      (t) => t.pessoaId === 2 && t.movimentos[0].competencia === '2026-11',
    )!
    expect(juliana.movimentos.map((m) => m.valorTotal)).toEqual([940, 150])
    expect(juliana.valorTotal).toBe(1090)
    expect(juliana.dataVencimento).toBe('2026-11-05')
  })

  it('1º mês proporcional aos dias restantes; vence no início se o dia de vencimento já passou', async () => {
    await api.contratosApi.criar({
      alunoId: 4,
      tipo: 'MENSAL',
      itens: [{ planoId: 3, qtdAulas: 2, valor: 680 }],
      dataInicio: '2026-11-20',
      diaVencimento: 10,
      proporcional: true,
      status: 'ATIVO',
    })
    expect(await api.transacoesApi.gerarMensalidades('2026-11')).toBe(3)

    const primeira = await ultima()
    expect(primeira.valorTotal).toBe(249.33) // 680 × 11/30
    expect(primeira.dataVencimento).toBe('2026-11-20')
    expect(primeira.movimentos[0].descricao).toBe('Tênis 2x por semana — 11/2026 (proporcional: 11 de 30 dias)')

    await api.transacoesApi.gerarMensalidades('2026-12')
    expect((await ultima()).valorTotal).toBe(680)
  })

  it('mensalidade cancelada não é gerada de novo', async () => {
    await api.transacoesApi.gerarMensalidades('2026-11')
    await api.transacoesApi.cancelar((await ultima()).id, 'bolsa integral')
    expect(await api.transacoesApi.gerarMensalidades('2026-11')).toBe(0)
  })
})

it('venda de pacote gera a cobrança, vencendo no início do contrato', async () => {
  await api.contratosApi.criar({
    alunoId: 3,
    tipo: 'PACOTE',
    itens: [{ planoId: 1, qtdAulas: 10, valor: 1150 }],
    dataInicio: '2026-10-12',
    dataFim: '2027-01-10',
    status: 'ATIVO',
  })
  const cobranca = await ultima()
  expect([cobranca.pessoaId, cobranca.valorTotal, cobranca.dataVencimento, cobranca.status]).toEqual([
    3,
    1150,
    '2026-10-12',
    'ABERTA',
  ])
})

describe('pagamento e cancelamento', () => {
  // transação 5: aluguel de raquete do Marcos, em aberto
  it('pagamento integral quita', async () => {
    const paga = await api.transacoesApi.registrarPagamento(5, { formaPagamentoId: 1, dataPagamento: '2026-10-12' })
    expect(paga.status).toBe('PAGA')
  })

  it('recusa pagamento com data futura', async () => {
    await expect(
      api.transacoesApi.registrarPagamento(5, { formaPagamentoId: 1, dataPagamento: '2026-10-13' }),
    ).rejects.toThrow('A data de pagamento não pode ser futura.')
  })

  it('só transação em aberto pode ser paga ou cancelada', async () => {
    await api.transacoesApi.registrarPagamento(5, { formaPagamentoId: 1, dataPagamento: '2026-10-12' })
    await expect(api.transacoesApi.cancelar(5, 'teste')).rejects.toThrow('Só transações em aberto podem ser alteradas.')
  })

  it('cancelamento guarda o motivo', async () => {
    const cancelada = await api.transacoesApi.cancelar(5, 'lançado por engano')
    expect([cancelada.status, cancelada.observacao]).toEqual(['CANCELADA', 'lançado por engano'])
  })

  it('transações não são excluídas', async () => {
    await expect(api.transacoesApi.excluir(5)).rejects.toThrow('cancele para manter o histórico')
  })
})

it('criar transação calcula os totais e exige o essencial', async () => {
  const receita = await api.transacoesApi.criar({
    tipo: 'RECEITA',
    pessoaId: 5,
    dataVencimento: '2026-10-15',
    movimentos: [{ servicoId: 4, descricao: 'Aluguel de raquete', quantidade: 3, valorUnitario: 15.1 }],
  })
  expect(receita.valorTotal).toBe(45.3)
  expect(receita.status).toBe('ABERTA')

  await expect(
    api.transacoesApi.criar({ tipo: 'DESPESA', dataVencimento: '2026-10-15', movimentos: [{ descricao: 'x', quantidade: 1, valorUnitario: 1 }] }),
  ).rejects.toThrow('Informe a categoria da despesa.')
})
