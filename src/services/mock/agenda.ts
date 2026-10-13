// Simula as regras do servidor para a agenda (ver agendamentos em docs/modelagem.md).
import type { Agendamento, Espaco, Id, ParticipanteAgendamento } from '../../types/models'
import { diaDaSemana, inicioDaSemana, somarDias } from '../../utils/data'
import { formatarData } from '../../utils/formatar'
import { funcionamentoDoDia } from '../../utils/funcionamento'
import { omitir } from '../../utils/objeto'
import { calcularValorLocacao } from '../../utils/precos'
import type { AgendamentosApi, DadosAgendamento } from '../api'
import { criarTransacao, transacoesApi } from './financeiro'
import { numerarNovos } from './numerar'
import {
  agendamentosBase,
  configuracoesApi,
  contratosBase,
  espacosApi,
  feriadosApi,
  pessoasApi,
  planosApi,
  transacoesBase,
  turmasAlunosApi,
  turmasApi,
} from './recursos'

type NovoParticipante = Omit<ParticipanteAgendamento, 'id'>

const hora = (dataHora: string) => dataHora.slice(11, 16)
const sobrepoe = (a: { dataInicio: string; dataFim: string }, b: { dataInicio: string; dataFim: string }) =>
  a.dataInicio < b.dataFim && b.dataInicio < a.dataFim

/** Item da cobrança de uma locação: "Locação Quadra 1 — 12/10/2026 08:00–09:00". */
const movimentoDaLocacao = (agendamento: Agendamento, espaco: Espaco) => ({
  agendamentoId: agendamento.id,
  descricao: `Locação ${espaco.nome} — ${formatarData(agendamento.dataInicio)} ${hora(agendamento.dataInicio)}–${hora(agendamento.dataFim)}`,
  quantidade: 1,
  valorUnitario: agendamento.valor ?? 0,
})

/** Cobrança (não cancelada) de uma locação. */
async function cobrancaDa(agendamentoId: Id) {
  return (await transacoesBase.listar()).find(
    (t) => t.status !== 'CANCELADA' && t.movimentos.some((m) => m.agendamentoId === agendamentoId),
  )
}

async function idsDeParticipantes() {
  return (await agendamentosBase.listar()).flatMap((a) => a.participantes.map((p) => p.id))
}

async function funcionamentoNaData(data: string) {
  const [configuracoes, feriados] = await Promise.all([configuracoesApi.buscar(), feriadosApi.listar()])
  return funcionamentoDoDia(configuracoes.funcionamento, feriados, data)
}

/**
 * Encontros de turma do dia, a partir de turmas_horarios. Idempotente: no backend real é uma
 * rotina que gera as próximas semanas; aqui roda sob demanda ao abrir o dia.
 */
async function gerarEncontrosTurma(data: string) {
  // dia fechado (ex.: feriado) não tem aula; em horário especial, só os encontros que cabem nele
  const funcionamento = await funcionamentoNaData(data)
  if (!funcionamento.aberto) return
  const cabe = (h: { horaInicio: string; horaFim: string }) =>
    h.horaInicio >= funcionamento.abertura && h.horaFim <= funcionamento.fechamento

  const dia = diaDaSemana(data)
  const [turmas, matriculas, existentes] = await Promise.all([
    turmasApi.listar(),
    turmasAlunosApi.listar(),
    agendamentosBase.listar(),
  ])
  for (const turma of turmas.filter((t) => t.ativo)) {
    for (const horario of turma.horarios.filter((h) => h.diaSemana === dia && cabe(h))) {
      const dataInicio = `${data}T${horario.horaInicio}:00`
      // um encontro remarcado guarda a data prevista: assim não nasce de novo no horário antigo
      if (existentes.some((a) => a.turmaId === turma.id && (a.dataOriginal ?? a.dataInicio) === dataInicio)) continue

      const alunos = matriculas.filter(
        (m) => m.turmaId === turma.id && m.dataEntrada <= data && (!m.dataSaida || m.dataSaida > data),
      )
      await agendamentosBase.criar({
        tipo: 'AULA_TURMA',
        espacoId: turma.espacoId,
        turmaId: turma.id,
        dataInicio,
        dataFim: `${data}T${horario.horaFim}:00`,
        status: 'AGENDADO',
        participantes: numerarNovos<NovoParticipante>(
          [
            { pessoaId: turma.professorId, papel: 'PROFESSOR', presenca: 'PENDENTE' },
            ...alunos.map((m): NovoParticipante => ({
              pessoaId: m.alunoId,
              papel: 'ALUNO',
              contratoItemId: m.contratoItemId,
              presenca: 'PENDENTE',
            })),
          ],
          await idsDeParticipantes(),
        ),
      })
    }
  }
}

/** Valida um agendamento novo ou alterado (`ignorar`: o próprio agendamento, nos conflitos). */
async function validar(dados: DadosAgendamento, ignorar?: Id) {
  const data = dados.dataInicio.slice(0, 10)
  const [inicio, fim] = [hora(dados.dataInicio), hora(dados.dataFim)]
  if (fim <= inicio) throw new Error('O fim deve ser depois do início.')
  const funcionamento = await funcionamentoNaData(data)
  if (!funcionamento.aberto) {
    const motivo = funcionamento.feriado ? ` (${funcionamento.feriado})` : ''
    throw new Error(`A academia está fechada em ${formatarData(data)}${motivo}.`)
  }
  if (inicio < funcionamento.abertura || fim > funcionamento.fechamento) {
    throw new Error(`Fora do horário de funcionamento do dia (${funcionamento.abertura} às ${funcionamento.fechamento}).`)
  }

  const espaco = await espacosApi.buscar(dados.espacoId)
  if (espaco.status !== 'ATIVO') throw new Error(`${espaco.nome}: indisponível (em manutenção ou inativo).`)

  if (dados.tipo === 'LOCACAO') {
    if (!dados.pessoaId) throw new Error('Informe o responsável pela locação.')
    if (dados.valor === undefined || dados.valor < 0) throw new Error('Informe o valor da locação.')
    const preco = calcularValorLocacao(espaco, diaDaSemana(data), inicio, fim)
    // o valor pode ser negociado, mas o horário precisa caber na tabela (ou ser um período, na churrasqueira)
    if ('erro' in preco) throw new Error(preco.erro)
  }
  if (dados.tipo === 'AULA') {
    if (!dados.modalidadeId) throw new Error('Informe a modalidade da aula.')
    if (!dados.participantes.some((p) => p.papel === 'PROFESSOR')) throw new Error('Informe o professor.')
    if (!dados.participantes.some((p) => p.papel === 'ALUNO')) throw new Error('Inclua ao menos um aluno.')
  }

  // conflitos: mesmo espaço, ou mesmo professor, em horários sobrepostos
  const doDia = (await agendamentosBase.listar()).filter(
    (a) => a.id !== ignorar && a.status !== 'CANCELADO' && a.dataInicio.startsWith(data) && sobrepoe(a, dados),
  )
  const noEspaco = doDia.find((a) => a.espacoId === dados.espacoId)
  if (noEspaco) {
    throw new Error(`Já existe agendamento em ${espaco.nome} das ${hora(noEspaco.dataInicio)} às ${hora(noEspaco.dataFim)}.`)
  }
  const professores = dados.participantes.filter((p) => p.papel === 'PROFESSOR').map((p) => p.pessoaId)
  const doProfessor = doDia.find((a) => a.participantes.some((p) => p.papel === 'PROFESSOR' && professores.includes(p.pessoaId)))
  if (doProfessor) {
    const professor = doProfessor.participantes.find((p) => p.papel === 'PROFESSOR' && professores.includes(p.pessoaId))!
    const nome = (await pessoasApi.buscar(professor.pessoaId)).nome
    throw new Error(`${nome} já tem aula das ${hora(doProfessor.dataInicio)} às ${hora(doProfessor.dataFim)}.`)
  }
  return espaco
}

/**
 * Gerações em fila: duas cargas simultâneas do mesmo dia (ex.: o StrictMode do React roda
 * efeitos duas vezes) criariam o encontro em dobro. No banco real, um unique impede isso.
 */
let filaDeGeracao = Promise.resolve()

function gerarEmFila(data: string) {
  const geracao = filaDeGeracao.then(() => gerarEncontrosTurma(data))
  filaDeGeracao = geracao.catch(() => {})
  return geracao
}

export const agendamentosApi: AgendamentosApi = {
  async listarDoDia(data) {
    await gerarEmFila(data)
    return (await agendamentosBase.listar())
      .filter((a) => a.dataInicio.startsWith(data))
      .sort((a, b) => a.dataInicio.localeCompare(b.dataInicio))
  },

  async criar(dados) {
    const espaco = await validar(dados)
    const agendamento = await agendamentosBase.criar({
      ...dados,
      status: 'AGENDADO',
      participantes: numerarNovos<NovoParticipante>(
        dados.participantes.map((p) => ({ ...p, presenca: 'PENDENTE' })),
        await idsDeParticipantes(),
      ),
    })
    if (agendamento.tipo === 'LOCACAO') {
      await criarTransacao({
        tipo: 'RECEITA',
        pessoaId: agendamento.pessoaId,
        dataVencimento: agendamento.dataInicio.slice(0, 10),
        movimentos: [movimentoDaLocacao(agendamento, espaco)],
      })
    }
    return agendamento
  },

  async atualizar(id, dados) {
    const atual = await agendamentosBase.buscar(id)
    if (atual.status === 'CANCELADO') throw new Error('Agendamento cancelado não pode ser alterado.')
    if (dados.tipo !== atual.tipo) throw new Error('O tipo do agendamento não pode mudar: cancele e crie outro.')

    const cobranca = atual.tipo === 'LOCACAO' ? await cobrancaDa(id) : undefined
    if (cobranca?.status === 'PAGA' && (dados.valor !== atual.valor || dados.pessoaId !== atual.pessoaId)) {
      throw new Error('A cobrança desta locação já foi paga: valor e responsável não podem mudar. Ajuste no Financeiro.')
    }
    const espaco = await validar(dados, id)

    // quem continua mantém id e presença; quem entra começa pendente
    const participantes = numerarNovos<NovoParticipante>(
      dados.participantes.map((p) => {
        const existente = atual.participantes.find((e) => e.pessoaId === p.pessoaId && e.papel === p.papel)
        return existente ? { ...p, id: existente.id, presenca: existente.presenca } : { ...p, presenca: 'PENDENTE' }
      }),
      await idsDeParticipantes(),
    )
    // encontro de turma remarcado guarda a data prevista (ver gerarEncontrosTurma)
    const dataOriginal =
      atual.tipo === 'AULA_TURMA' && dados.dataInicio !== atual.dataInicio
        ? (atual.dataOriginal ?? atual.dataInicio)
        : atual.dataOriginal

    const salvo = await agendamentosBase.atualizar(id, { ...dados, status: atual.status, participantes, dataOriginal })

    // a cobrança em aberto acompanha a locação (valor, responsável, data e descrição)
    if (cobranca?.status === 'ABERTA') {
      const movimento = cobranca.movimentos.find((m) => m.agendamentoId === id)!
      await transacoesApi.atualizar(cobranca.id, {
        ...omitir(cobranca, 'id', 'movimentos', 'valorTotal', 'data', 'status', 'formaPagamentoId', 'dataPagamento'),
        pessoaId: salvo.pessoaId,
        dataVencimento: salvo.dataInicio.slice(0, 10),
        movimentos: cobranca.movimentos.map((m) => (m === movimento ? { ...movimentoDaLocacao(salvo, espaco), id: m.id } : m)),
      })
    }
    return salvo
  },

  async cancelar(id, motivo) {
    const agendamento = await agendamentosBase.buscar(id)
    if (agendamento.status === 'CANCELADO') throw new Error('O agendamento já está cancelado.')
    const cobranca = await cobrancaDa(id)
    // cobrança já paga fica como está: a devolução, se houver, é decisão do gestor no Financeiro
    if (cobranca?.status === 'ABERTA') await transacoesApi.cancelar(cobranca.id, `Agendamento cancelado: ${motivo}`)
    return agendamentosBase.atualizar(id, { ...agendamento, status: 'CANCELADO', observacao: motivo })
  },

  async registrarPresenca(id, participanteId, presenca) {
    const agendamento = await agendamentosBase.buscar(id)
    if (agendamento.status === 'CANCELADO') throw new Error('Agendamento cancelado.')
    return agendamentosBase.atualizar(id, {
      ...agendamento,
      participantes: agendamento.participantes.map((p) => (p.id === participanteId ? { ...p, presenca } : p)),
    })
  },

  async consultarCota(contratoItemId: Id, data) {
    const [contratos, planos, agendamentos] = await Promise.all([
      contratosBase.listar(),
      planosApi.listar(),
      agendamentosBase.listar(),
    ])
    const contrato = contratos.find((c) => c.itens.some((i) => i.id === contratoItemId))
    const item = contrato?.itens.find((i) => i.id === contratoItemId)
    if (!contrato || !item) throw new Error('Item de contrato não encontrado.')

    const mensal = planos.find((p) => p.id === item.planoId)?.tipo === 'MENSAL'
    const semana = inicioDaSemana(data)
    const proximaSemana = somarDias(semana, 7)
    const conta = (a: Agendamento) =>
      a.status !== 'CANCELADO' && (!mensal || (a.dataInicio >= semana && a.dataInicio < proximaSemana))
    const usadas = agendamentos
      .filter(conta)
      .flatMap((a) => a.participantes)
      .filter((p) => p.contratoItemId === contratoItemId && p.presenca !== 'FALTA_JUSTIFICADA').length

    return { usadas, limite: item.qtdAulas, periodo: mensal ? 'SEMANA' : 'PACOTE' }
  },
}
