import { beforeEach, describe, expect, it } from 'vitest'
import { novoServidor } from '../../testes/servidor'

let api: Awaited<ReturnType<typeof novoServidor>>

beforeEach(async () => {
  api = await novoServidor()
})

// hoje nos testes: 12/10/2026 (outubro tem 31 dias)

it('itens novos ganham id sem colidir com os existentes; itens mantidos preservam o id', async () => {
  const contrato = await api.contratosApi.buscar(3) // Juliana: itens 3 e 4
  const ajustado = await api.contratosApi.atualizar(3, {
    ...contrato,
    itens: [...contrato.itens, { planoId: 6, qtdAulas: 2, valor: 300 }],
  })
  expect(ajustado.itens.map((i) => i.id)).toEqual([3, 4, 6])
})

describe('finalizar', () => {
  it('encerrar mensal ativo: fim hoje, com a cobrança final escolhida', async () => {
    const encerrado = await api.contratosApi.finalizar(1, { status: 'ENCERRADO', cobrancaFinal: 'INTEGRAL' })
    expect([encerrado.status, encerrado.dataFim, encerrado.cobrancaFinal]).toEqual(['ENCERRADO', '2026-10-12', 'INTEGRAL'])
  })

  it('mensal exige a escolha da cobrança final; pacote não', async () => {
    await expect(api.contratosApi.finalizar(1, { status: 'ENCERRADO' })).rejects.toThrow('Informe como cobrar o último mês.')
    const pacote = await api.contratosApi.finalizar(2, { status: 'CANCELADO' })
    expect([pacote.status, pacote.dataFim, pacote.cobrancaFinal]).toEqual(['CANCELADO', '2026-10-12', undefined])
  })

  it('proporcional exige o valor do último mês, até o integral', async () => {
    const proporcional = (valorFinal?: number) =>
      api.contratosApi.finalizar(1, { status: 'ENCERRADO', cobrancaFinal: 'PROPORCIONAL', valorFinal })
    await expect(proporcional()).rejects.toThrow('O valor do último mês deve ser de R$ 0,01 até')
    await expect(proporcional(380.01)).rejects.toThrow('(o mês integral)')
    expect((await proporcional(380)).valorFinal).toBe(380)
  })

  it('só contrato ativo pode ser encerrado ou cancelado', async () => {
    await expect(api.contratosApi.finalizar(4, { status: 'CANCELADO' })).rejects.toThrow('Só contratos ativos')
  })
})

describe('mensalidades ao finalizar', () => {
  const mensalidadeDe = async (alunoId: number, competencia: string) =>
    (await api.transacoesApi.listar()).find(
      (t) => t.pessoaId === alunoId && t.movimentos.some((m) => m.competencia === competencia),
    )!

  it('proporcional ajusta a mensalidade em aberto do mês para o valor definido pelo gestor', async () => {
    // Ana: mensal R$ 380, mensalidade de 10/2026 em aberto nos dados de exemplo
    await api.contratosApi.finalizar(1, { status: 'CANCELADO', cobrancaFinal: 'PROPORCIONAL', valorFinal: 150 })
    const outubro = await mensalidadeDe(3, '2026-10')
    expect(outubro.valorTotal).toBe(150)
    expect(outubro.movimentos[0].descricao).toBe('Tênis 1x por semana — 10/2026 (proporcional: 12 de 31 dias)')
  })

  it('integral mantém o mês cheio', async () => {
    await api.contratosApi.finalizar(1, { status: 'ENCERRADO', cobrancaFinal: 'INTEGRAL' })
    expect((await mensalidadeDe(3, '2026-10')).valorTotal).toBe(380)
  })

  it('mensalidade já paga não muda', async () => {
    // Juliana pagou 10/2026 (R$ 1.090)
    await api.contratosApi.finalizar(3, { status: 'ENCERRADO', cobrancaFinal: 'PROPORCIONAL', valorFinal: 500 })
    const outubro = await mensalidadeDe(2, '2026-10')
    expect([outubro.status, outubro.valorTotal]).toEqual(['PAGA', 1090])
  })

  it('mensalidades em aberto de meses seguintes são canceladas', async () => {
    await api.transacoesApi.gerarMensalidades('2026-11')
    await api.contratosApi.finalizar(1, { status: 'ENCERRADO', cobrancaFinal: 'INTEGRAL' })
    const novembro = await mensalidadeDe(3, '2026-11')
    expect([novembro.status, novembro.observacao]).toEqual(['CANCELADA', 'Contrato encerrado antes deste mês.'])
  })

  it('contrato encerrado antes da geração ainda é cobrado no mês, com o valor rateado entre os itens', async () => {
    // antes da correção, um contrato encerrado antes de gerar o mês ficava sem cobrança nenhuma
    const contrato = await api.contratosApi.criar({
      alunoId: 4,
      tipo: 'MENSAL',
      itens: [
        { planoId: 3, qtdAulas: 2, valor: 600 },
        { planoId: 6, qtdAulas: 1, valor: 200 },
      ],
      dataInicio: '2026-10-01',
      diaVencimento: 10,
      status: 'ATIVO',
    })
    await api.contratosApi.finalizar(contrato.id, { status: 'CANCELADO', cobrancaFinal: 'PROPORCIONAL', valorFinal: 100 })

    expect(await api.transacoesApi.gerarMensalidades('2026-10')).toBe(1)
    expect((await mensalidadeDe(4, '2026-10')).movimentos.map((m) => m.valorTotal)).toEqual([75, 25])
    // e não é cobrado em novembro
    await api.transacoesApi.gerarMensalidades('2026-11')
    expect(
      (await api.transacoesApi.listar()).some((t) =>
        t.movimentos.some((m) => m.competencia === '2026-11' && m.contratoItemId === contrato.itens[0].id),
      ),
    ).toBe(false)
  })
})
