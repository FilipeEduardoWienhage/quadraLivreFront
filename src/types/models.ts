// Tipos das entidades, espelhando docs/modelagem.md.
// Os nomes seguem o JSON que a API Java vai devolver (camelCase), não as colunas do banco.
// Datas trafegam como string ISO: 'YYYY-MM-DD', 'YYYY-MM-DDTHH:mm:ss' ou 'HH:mm'.

export type Id = number

/** 0 = domingo … 6 = sábado */
export type DiaSemana = 0 | 1 | 2 | 3 | 4 | 5 | 6

export type Nivel = 'INICIANTE' | 'INTERMEDIARIO' | 'AVANCADO'
export type StatusQuadra = 'ATIVA' | 'MANUTENCAO' | 'INATIVA'
export type TipoPlano = 'PACOTE' | 'MENSAL'
export type StatusContrato = 'ATIVO' | 'ENCERRADO' | 'CANCELADO'
export type TipoAgendamento = 'LOCACAO' | 'AULA_PARTICULAR' | 'AULA_TURMA'
export type StatusAgendamento = 'AGENDADO' | 'REALIZADO' | 'CANCELADO'
export type PapelParticipante = 'ALUNO' | 'PROFESSOR' | 'JOGADOR'
export type Presenca = 'PENDENTE' | 'PRESENTE' | 'FALTA' | 'FALTA_JUSTIFICADA'
export type StatusTransacao = 'ABERTA' | 'PAGA' | 'CANCELADA'

export interface Usuario {
  id: Id
  nome: string
  login: string
  ativo: boolean
}

export interface TipoPessoa {
  id: Id
  descricao: string
}

export interface Pessoa {
  id: Id
  tipoPessoaId: Id
  nome: string
  email?: string
  telefone?: string
  cpf?: string
  dataNascimento?: string
  nivel?: Nivel
  observacao?: string
  ativo: boolean
  dataCadastro: string
}

export interface Quadra {
  id: Id
  nome: string
  status: StatusQuadra
}

export interface PrecoQuadra {
  id: Id
  quadraId: Id
  diaSemana: DiaSemana
  horaInicio: string
  horaFim: string
  valorHora: number
}

export interface Servico {
  id: Id
  nome: string
  valor: number
  ativo: boolean
}

export interface FormaPagamento {
  id: Id
  descricao: string
  ativo: boolean
}

export interface DisponibilidadeProfessor {
  id: Id
  professorId: Id
  diaSemana: DiaSemana
  horaInicio: string
  horaFim: string
}

export interface Plano {
  id: Id
  nome: string
  tipo: TipoPlano
  /** PACOTE: total de aulas; MENSAL: aulas por semana */
  qtdAulas: number
  /** PACOTE: prazo em dias para usar as aulas */
  validadeDias?: number
  valor: number
  ativo: boolean
}

export interface Contrato {
  id: Id
  alunoId: Id
  planoId: Id
  dataInicio: string
  dataFim?: string
  qtdAulas: number
  valor: number
  /** MENSAL: dia do mês da cobrança */
  diaVencimento?: number
  status: StatusContrato
}

export interface Turma {
  id: Id
  nome: string
  professorId: Id
  quadraId: Id
  nivel?: Nivel
  capacidade: number
  ativo: boolean
}

export interface TurmaHorario {
  id: Id
  turmaId: Id
  diaSemana: DiaSemana
  horaInicio: string
  horaFim: string
}

export interface TurmaAluno {
  id: Id
  turmaId: Id
  alunoId: Id
  contratoId?: Id
  dataEntrada: string
  /** vazio = ainda está na turma */
  dataSaida?: string
}

export interface Agendamento {
  id: Id
  tipo: TipoAgendamento
  quadraId: Id
  /** responsável; vazio em AULA_TURMA */
  pessoaId?: Id
  turmaId?: Id
  dataInicio: string
  dataFim: string
  status: StatusAgendamento
  observacao?: string
}

export interface ParticipanteAgendamento {
  id: Id
  agendamentoId: Id
  pessoaId: Id
  papel: PapelParticipante
  contratoId?: Id
  presenca: Presenca
}

export interface Transacao {
  id: Id
  pessoaId: Id
  formaPagamentoId?: Id
  valorTotal: number
  data: string
  dataVencimento?: string
  dataPagamento?: string
  status: StatusTransacao
}

export interface Movimento {
  id: Id
  transacaoId: Id
  servicoId?: Id
  agendamentoId?: Id
  contratoId?: Id
  descricao: string
  quantidade: number
  valorUnitario: number
  valorTotal: number
}
