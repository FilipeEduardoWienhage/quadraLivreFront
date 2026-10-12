import { beforeEach, describe, expect, it } from 'vitest'
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
