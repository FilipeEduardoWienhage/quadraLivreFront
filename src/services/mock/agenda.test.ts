import { beforeEach, describe, expect, it } from 'vitest'
import type { Agendamento } from '../../types/models'
import { omitir } from '../../utils/objeto'
import type { DadosAgendamento } from '../api'
import { novoServidor } from '../../testes/servidor'

let api: Awaited<ReturnType<typeof novoServidor>>

beforeEach(async () => {
  api = await novoServidor()
})

const SEGUNDA = '2026-10-12'

/** Locação do Marcos (cliente) por padrão. */
const locacao = (espacoId: number, inicio: string, fim: string, valor = 80, data = SEGUNDA): DadosAgendamento => ({
  tipo: 'LOCACAO',
  espacoId,
  pessoaId: 5,
  dataInicio: `${data}T${inicio}:00`,
  dataFim: `${data}T${fim}:00`,
  valor,
  participantes: [],
})

describe('encontros de turma', () => {
  it('nascem dos horários da turma, com professor e alunos (com o item do contrato)', async () => {
    const dia = await api.agendamentosApi.listarDoDia(SEGUNDA)
    expect(dia.map((a) => `${a.tipo} ${a.dataInicio.slice(11, 16)}`)).toEqual([
      'LOCACAO 08:00',
      'AULA 08:00',
      'AULA 10:00',
      'AULA_TURMA 18:00',
    ])
    const turma = dia.find((a) => a.tipo === 'AULA_TURMA')!
    expect(turma.participantes.map((p) => [p.pessoaId, p.papel, p.contratoItemId])).toEqual([
      [1, 'PROFESSOR', undefined],
      [3, 'ALUNO', 1],
    ])
  })

  it('abrir o dia de novo (ou duas vezes ao mesmo tempo) não duplica', async () => {
    await Promise.all([api.agendamentosApi.listarDoDia(SEGUNDA), api.agendamentosApi.listarDoDia(SEGUNDA)])
    const turmas = (await api.agendamentosApi.listarDoDia(SEGUNDA)).filter((a) => a.tipo === 'AULA_TURMA')
    expect(turmas).toHaveLength(1)
  })
})

describe('validações ao agendar', () => {
  it('recusa conflito no mesmo espaço', async () => {
    await expect(api.agendamentosApi.criar(locacao(1, '08:30', '09:30'))).rejects.toThrow(
      'Já existe agendamento em Quadra 1 das 08:00 às 09:00.',
    )
  })

  it('recusa conflito do professor em outro espaço', async () => {
    await api.agendamentosApi.listarDoDia(SEGUNDA) // gera a turma de Carlos às 18h
    await expect(
      api.agendamentosApi.criar({
        tipo: 'AULA',
        espacoId: 4,
        modalidadeId: 1,
        dataInicio: `${SEGUNDA}T18:30:00`,
        dataFim: `${SEGUNDA}T19:30:00`,
        participantes: [
          { pessoaId: 1, papel: 'PROFESSOR' },
          { pessoaId: 4, papel: 'ALUNO', contratoItemId: 2 },
        ],
      }),
    ).rejects.toThrow('Carlos Mendes já tem aula das 18:00 às 19:00.')
  })

  it('recusa fora do funcionamento, espaço em manutenção e fora dos períodos', async () => {
    await expect(api.agendamentosApi.criar(locacao(2, '06:00', '07:00'))).rejects.toThrow('Fora do horário de funcionamento')
    await expect(api.agendamentosApi.criar(locacao(3, '12:00', '13:00'))).rejects.toThrow('Quadra 3: indisponível')
    await expect(api.agendamentosApi.criar(locacao(5, '12:00', '13:00', 200))).rejects.toThrow(
      'Escolha um dos períodos disponíveis no dia.',
    )
  })

  it('aceita horário quebrado e período da churrasqueira', async () => {
    const quebrado = await api.agendamentosApi.criar(locacao(2, '20:00', '21:22', 164))
    expect(quebrado.dataFim).toBe(`${SEGUNDA}T21:22:00`)
    const reserva = await api.agendamentosApi.criar(locacao(5, '11:00', '16:00', 200, '2026-10-17'))
    expect(reserva.valor).toBe(200)
  })
})

describe('horário de funcionamento', () => {
  it('limite é o do dia: domingo fecha às 20h', async () => {
    await expect(api.agendamentosApi.criar(locacao(2, '19:30', '20:30', 100, '2026-10-18'))).rejects.toThrow(
      'Fora do horário de funcionamento do dia (08:00 às 20:00).',
    )
  })

  it('feriado fechado recusa agendamento e não gera encontros de turma', async () => {
    // segunda-feira com turma às 18h, transformada em feriado
    await api.feriadosApi.criar({ data: '2026-10-19', nome: 'Feriado municipal', anual: false, aberto: false })
    await expect(api.agendamentosApi.criar(locacao(2, '10:00', '11:00', 80, '2026-10-19'))).rejects.toThrow(
      'A academia está fechada em 19/10/2026 (Feriado municipal).',
    )
    expect(await api.agendamentosApi.listarDoDia('2026-10-19')).toEqual([])
  })

  it('horário especial: só gera os encontros que cabem nele', async () => {
    await api.feriadosApi.criar({ data: '2026-10-19', nome: 'Ponto facultativo', anual: false, aberto: true, abertura: '08:00', fechamento: '14:00' })
    expect(await api.agendamentosApi.listarDoDia('2026-10-19')).toEqual([]) // a turma é às 18h
    await expect(api.agendamentosApi.criar(locacao(2, '14:00', '15:00', 80, '2026-10-19'))).rejects.toThrow('(08:00 às 14:00)')
  })

  it('dia da semana fechado nas configurações', async () => {
    const configuracoes = await api.configuracoesApi.buscar()
    await api.configuracoesApi.salvar({
      ...configuracoes,
      funcionamento: configuracoes.funcionamento.map((h) => (h.diaSemana === 0 ? { ...h, aberto: false } : h)),
    })
    await expect(api.agendamentosApi.criar(locacao(2, '10:00', '11:00', 100, '2026-10-18'))).rejects.toThrow(
      'A academia está fechada em 18/10/2026.',
    )
  })
})

describe('editar agendamento', () => {
  /** Dados de envio a partir de um agendamento salvo (como o formulário faz). */
  const paraDados = (a: Agendamento): DadosAgendamento => ({
    ...omitir(a, 'id', 'status', 'participantes', 'dataOriginal'),
    participantes: a.participantes.map((p) => omitir(p, 'id', 'presenca')),
  })
  const cobrancaDaLocacao = async (id: number) =>
    (await api.transacoesApi.listar()).find((t) => t.movimentos.some((m) => m.agendamentoId === id))!

  it('mudar horário e valor da locação atualiza a cobrança em aberto', async () => {
    const locacao1 = await api.agendamentosApi.atualizar(1, {
      ...paraDados(await api.agendamentosApi.listarDoDia(SEGUNDA).then((d) => d[0])),
      dataInicio: `${SEGUNDA}T09:00:00`,
      dataFim: `${SEGUNDA}T10:30:00`,
      valor: 120,
    })
    expect(locacao1.dataInicio).toBe(`${SEGUNDA}T09:00:00`)
    const cobranca = await cobrancaDaLocacao(1)
    expect(cobranca.valorTotal).toBe(120)
    expect(cobranca.movimentos[0].descricao).toBe('Locação Quadra 1 — 12/10/2026 09:00–10:30')
  })

  it('salvar sem mudar o horário não conflita com o próprio agendamento', async () => {
    const original = await api.agendamentosApi.listarDoDia(SEGUNDA).then((d) => d.find((a) => a.id === 1)!)
    const salvo = await api.agendamentosApi.atualizar(1, { ...paraDados(original), observacao: 'cliente pediu raquete' })
    expect(salvo.observacao).toBe('cliente pediu raquete')
  })

  it('cobrança paga trava valor e responsável, mas não o horário', async () => {
    const original = await api.agendamentosApi.listarDoDia(SEGUNDA).then((d) => d.find((a) => a.id === 1)!)
    await api.transacoesApi.registrarPagamento((await cobrancaDaLocacao(1)).id, { formaPagamentoId: 1, dataPagamento: SEGUNDA })

    await expect(api.agendamentosApi.atualizar(1, { ...paraDados(original), valor: 60 })).rejects.toThrow('já foi paga')
    const remarcada = await api.agendamentosApi.atualizar(1, {
      ...paraDados(original),
      dataInicio: `${SEGUNDA}T11:00:00`,
      dataFim: `${SEGUNDA}T12:00:00`,
    })
    expect(remarcada.dataInicio).toBe(`${SEGUNDA}T11:00:00`)
  })

  it('participantes que continuam mantêm a presença; quem entra começa pendente', async () => {
    const aula = await api.agendamentosApi.listarDoDia(SEGUNDA).then((d) => d.find((a) => a.id === 3)!)
    const bruno = aula.participantes.find((p) => p.pessoaId === 4)!
    await api.agendamentosApi.registrarPresenca(3, bruno.id, 'PRESENTE')

    const dados = paraDados(aula)
    const salva = await api.agendamentosApi.atualizar(3, {
      ...dados,
      participantes: [...dados.participantes, { pessoaId: 3, papel: 'ALUNO', contratoItemId: 1 }],
    })
    expect(salva.participantes.map((p) => [p.pessoaId, p.presenca])).toEqual([
      [1, 'PENDENTE'],
      [4, 'PRESENTE'],
      [3, 'PENDENTE'],
    ])
  })

  it('encontro de turma remarcado não nasce de novo no horário antigo', async () => {
    const turma = (await api.agendamentosApi.listarDoDia(SEGUNDA)).find((a) => a.tipo === 'AULA_TURMA')!
    const remarcado = await api.agendamentosApi.atualizar(turma.id, {
      ...paraDados(turma),
      espacoId: 2,
      dataInicio: `${SEGUNDA}T19:00:00`,
      dataFim: `${SEGUNDA}T20:00:00`,
    })
    expect(remarcado.dataOriginal).toBe(`${SEGUNDA}T18:00:00`)
    const turmas = (await api.agendamentosApi.listarDoDia(SEGUNDA)).filter((a) => a.tipo === 'AULA_TURMA')
    expect(turmas.map((a) => a.dataInicio)).toEqual([`${SEGUNDA}T19:00:00`])
  })

  it('o tipo não muda e cancelado não é editável', async () => {
    const original = await api.agendamentosApi.listarDoDia(SEGUNDA).then((d) => d.find((a) => a.id === 1)!)
    await expect(api.agendamentosApi.atualizar(1, { ...paraDados(original), tipo: 'AULA' })).rejects.toThrow(
      'O tipo do agendamento não pode mudar',
    )
    await api.agendamentosApi.cancelar(1, 'teste')
    await expect(api.agendamentosApi.atualizar(1, paraDados(original))).rejects.toThrow('cancelado não pode ser alterado')
  })

  it('edição respeita conflitos com outros agendamentos', async () => {
    const original = await api.agendamentosApi.listarDoDia(SEGUNDA).then((d) => d.find((a) => a.id === 1)!)
    // a turma das 18h está na Quadra 1
    await expect(
      api.agendamentosApi.atualizar(1, { ...paraDados(original), dataInicio: `${SEGUNDA}T18:30:00`, dataFim: `${SEGUNDA}T19:30:00` }),
    ).rejects.toThrow('Já existe agendamento em Quadra 1 das 18:00 às 19:00.')
  })
})

describe('locação e cobrança', () => {
  it('a cobrança nasce com o valor negociado', async () => {
    const reserva = await api.agendamentosApi.criar(locacao(2, '17:00', '19:00', 180))
    const cobranca = (await api.transacoesApi.listar()).find((t) => t.movimentos.some((m) => m.agendamentoId === reserva.id))!
    expect([cobranca.valorTotal, cobranca.dataVencimento, cobranca.status]).toEqual([180, SEGUNDA, 'ABERTA'])
  })

  it('cancelar a locação cancela a cobrança em aberto', async () => {
    const reserva = await api.agendamentosApi.criar(locacao(2, '17:00', '19:00', 180))
    await api.agendamentosApi.cancelar(reserva.id, 'cliente desistiu')
    const cobranca = (await api.transacoesApi.listar()).find((t) => t.movimentos.some((m) => m.agendamentoId === reserva.id))!
    expect([cobranca.status, cobranca.observacao]).toEqual(['CANCELADA', 'Agendamento cancelado: cliente desistiu'])
  })

  it('cobrança já paga continua paga (devolução é decisão do gestor)', async () => {
    const reserva = await api.agendamentosApi.criar(locacao(2, '17:00', '19:00', 180))
    const cobranca = (await api.transacoesApi.listar()).at(-1)!
    await api.transacoesApi.registrarPagamento(cobranca.id, { formaPagamentoId: 1, dataPagamento: SEGUNDA })
    await api.agendamentosApi.cancelar(reserva.id, 'chuva')
    expect((await api.transacoesApi.buscar(cobranca.id)).status).toBe('PAGA')
  })

  it('com devolução, a cobrança paga ganha uma devolução do valor integral', async () => {
    const reserva = await api.agendamentosApi.criar(locacao(2, '17:00', '19:00', 180))
    const cobranca = (await api.transacoesApi.listar()).at(-1)!
    await api.transacoesApi.registrarPagamento(cobranca.id, { formaPagamentoId: 1, dataPagamento: SEGUNDA })
    await api.agendamentosApi.cancelar(reserva.id, 'chuva', { devolver: true })
    const devolucao = (await api.transacoesApi.listar()).find((t) => t.origemId === cobranca.id)!
    expect([devolucao.valorTotal, devolucao.observacao, devolucao.dataVencimento]).toEqual([
      180,
      'Locação cancelada: chuva',
      SEGUNDA,
    ])
  })
})

describe('cota do contrato', () => {
  it('mensal conta a semana; pacote conta o total', async () => {
    await api.agendamentosApi.listarDoDia(SEGUNDA)
    expect(await api.agendamentosApi.consultarCota(1, SEGUNDA)).toEqual({ usadas: 1, limite: 1, periodo: 'SEMANA' })
    expect(await api.agendamentosApi.consultarCota(2, SEGUNDA)).toEqual({ usadas: 1, limite: 10, periodo: 'PACOTE' })
    // semana seguinte zera a cota mensal
    expect((await api.agendamentosApi.consultarCota(1, '2026-10-19')).usadas).toBe(0)
  })

  it('falta justificada não consome a cota', async () => {
    const turma = (await api.agendamentosApi.listarDoDia(SEGUNDA)).find((a) => a.tipo === 'AULA_TURMA')!
    const ana = turma.participantes.find((p) => p.pessoaId === 3)!
    await api.agendamentosApi.registrarPresenca(turma.id, ana.id, 'FALTA_JUSTIFICADA')
    expect((await api.agendamentosApi.consultarCota(1, SEGUNDA)).usadas).toBe(0)
  })
})
