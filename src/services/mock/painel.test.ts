import { beforeEach, expect, it } from 'vitest'
import { novoServidor } from '../../testes/servidor'

let api: Awaited<ReturnType<typeof novoServidor>>

beforeEach(async () => {
  api = await novoServidor()
})

// hoje nos testes: segunda, 12/10/2026, 10:00

it('dinheiro do mês: recebido e previsto', async () => {
  const resumo = await api.painelApi.resumo()
  // pago em 10/2026: Juliana 1.090; previsto: Ana 380 + Juliana 1.090 + raquete 30 + locação 80
  expect([resumo.recebidoNoMes, resumo.previstoNoMes]).toEqual([1090, 1580])
})

it('cobranças vencidas: só receitas em aberto com vencimento passado', async () => {
  const resumo = await api.painelApi.resumo()
  expect(resumo.cobrancasVencidas.map((t) => t.id)).toEqual([2]) // mensalidade da Ana, venceu 10/10
})

it('presença pendente: aulas já terminadas; as que ainda não acabaram ficam de fora', async () => {
  // aula das 8h (Juliana) terminou; a das 10h (Bruno) está acontecendo. Entram também os
  // encontros de turma da última semana, gerados sem presença registrada
  const ids = async () => (await api.painelApi.resumo()).presencasPendentes.map((a) => a.id)
  const antes = await ids()
  expect(antes).toContain(2)
  expect(antes).not.toContain(3)
  expect((await api.painelApi.resumo()).presencasPendentes.every((a) => a.dataFim <= '2026-10-12T10:00:00')).toBe(true)

  await api.agendamentosApi.registrarPresenca(2, 2, 'PRESENTE')
  expect(await ids()).not.toContain(2)
})

it('pacote terminando: poucas aulas restantes ou validade perto do fim', async () => {
  // Bruno: 10 aulas, 1 marcada, vence 30/11 — ainda não
  expect((await api.painelApi.resumo()).pacotesTerminando).toEqual([])

  await api.contratosApi.criar({
    alunoId: 3,
    tipo: 'PACOTE',
    itens: [{ planoId: 1, qtdAulas: 10, valor: 1100 }],
    dataInicio: '2026-07-20',
    dataFim: '2026-10-20',
    status: 'ATIVO',
  })
  expect((await api.painelApi.resumo()).pacotesTerminando).toMatchObject([
    { alunoId: 3, planoId: 1, restantes: 10, validade: '2026-10-20' },
  ])
})

it('devoluções em aberto e mensalidades não geradas', async () => {
  await api.transacoesApi.registrarDevolucao(3, { valor: 300, motivo: 'desistência', dataVencimento: '2026-10-15' })
  await api.contratosApi.criar({
    alunoId: 4,
    tipo: 'MENSAL',
    itens: [{ planoId: 3, qtdAulas: 2, valor: 680 }],
    dataInicio: '2026-10-05',
    diaVencimento: 10,
    status: 'ATIVO',
  })
  const resumo = await api.painelApi.resumo()
  expect(resumo.devolucoesEmAberto.map((t) => t.valorTotal)).toEqual([300])
  expect(resumo.mensalidadesNaoGeradas).toBe(1)
})
