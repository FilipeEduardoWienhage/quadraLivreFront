// Tipos das entidades, espelhando docs/modelagem.md.
// Os nomes seguem o JSON que a API Java vai devolver (camelCase), não as colunas do banco.
// Datas trafegam como string ISO: 'YYYY-MM-DD', 'YYYY-MM-DDTHH:mm:ss' ou 'HH:mm'.

export type Id = number

/** 0 = domingo … 6 = sábado */
export type DiaSemana = 0 | 1 | 2 | 3 | 4 | 5 | 6

export type Nivel = 'INICIANTE' | 'INTERMEDIARIO' | 'AVANCADO'
export type TipoEspaco = 'QUADRA' | 'OUTRO'
export type StatusEspaco = 'ATIVO' | 'MANUTENCAO' | 'INATIVO'
/** NAO: só recebe aulas e turmas; POR_PERIODO: cada faixa de preço é um período reservável */
export type FormaLocacao = 'NAO' | 'POR_HORA' | 'POR_PERIODO'
export type TipoPlano = 'PACOTE' | 'MENSAL'
export type StatusContrato = 'ATIVO' | 'ENCERRADO' | 'CANCELADO'
/** AULA: qualquer aula fora de turma, com um ou mais alunos */
export type TipoAgendamento = 'LOCACAO' | 'AULA' | 'AULA_TURMA'
export type StatusAgendamento = 'AGENDADO' | 'REALIZADO' | 'CANCELADO'
export type PapelParticipante = 'ALUNO' | 'PROFESSOR' | 'JOGADOR'
export type Presenca = 'PENDENTE' | 'PRESENTE' | 'FALTA' | 'FALTA_JUSTIFICADA'
export type TipoTransacao = 'RECEITA' | 'DESPESA'
export type StatusTransacao = 'ABERTA' | 'PAGA' | 'CANCELADA'

/** Faixa de horário que se repete toda semana. */
export interface HorarioSemanal {
  diaSemana: DiaSemana
  /** 'HH:mm' */
  horaInicio: string
  /** 'HH:mm' */
  horaFim: string
}

export interface Usuario {
  id: Id
  nome: string
  login: string
  ativo: boolean
}

export interface Pessoa {
  id: Id
  nome: string
  /** papéis acumuláveis que liberam funções; qualquer pessoa pode alugar, mesmo sem papel */
  aluno: boolean
  professor: boolean
  email?: string
  telefone?: string
  cpf?: string
  dataNascimento?: string
  nivel?: Nivel
  observacao?: string
  ativo: boolean
  dataCadastro: string
}

/** Tudo que pode ser agendado: quadras e outros espaços (sala, churrasqueira, paredão…). */
export interface Espaco {
  id: Id
  nome: string
  tipo: TipoEspaco
  status: StatusEspaco
  locacao: FormaLocacao
  /** linhas de precos_espacos; trafegam junto com o espaço. Vazio quando locacao = NAO */
  precos: FaixaPreco[]
}

/** POR_HORA: valor da hora dentro da faixa. POR_PERIODO: valor fechado do período. */
export interface FaixaPreco extends HorarioSemanal {
  valor: number
}

export interface Modalidade {
  id: Id
  nome: string
  /** '#RRGGBB': cor das aulas e turmas da modalidade na agenda */
  cor: string
  ativo: boolean
}

/** Configurações gerais da academia (registro único). */
export interface Configuracoes {
  /** '#RRGGBB': cor das locações e reservas na agenda */
  corLocacao: string
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

export interface DisponibilidadeProfessor extends HorarioSemanal {
  id: Id
  professorId: Id
}

export interface Plano {
  id: Id
  modalidadeId: Id
  nome: string
  tipo: TipoPlano
  /** PACOTE: total de aulas; MENSAL: aulas por semana */
  qtdAulas: number
  /** PACOTE: prazo em dias para usar as aulas */
  validadeDias?: number
  valor: number
  ativo: boolean
}

/** Plano contratado, com os valores copiados do plano na venda. */
export interface ContratoItem {
  id: Id
  planoId: Id
  /** PACOTE: total de aulas; MENSAL: cota semanal */
  qtdAulas: number
  valor: number
}

export interface Contrato {
  id: Id
  alunoId: Id
  /** todos os itens têm planos deste tipo */
  tipo: TipoPlano
  /** linhas de contratos_itens; trafegam junto com o contrato */
  itens: ContratoItem[]
  dataInicio: string
  /** PACOTE: início + maior validade entre os itens; MENSAL: vazio enquanto ativo */
  dataFim?: string
  /** MENSAL: dia do mês da cobrança */
  diaVencimento?: number
  /** MENSAL: 1ª mensalidade proporcional aos dias restantes do mês */
  proporcional?: boolean
  /** motivo de ajustes feitos depois da venda (renegociação, cortesia…) */
  observacao?: string
  status: StatusContrato
}

export interface Turma {
  id: Id
  nome: string
  modalidadeId: Id
  professorId: Id
  espacoId: Id
  nivel?: Nivel
  capacidade: number
  ativo: boolean
  /** linhas de turmas_horarios; trafegam junto com a turma, que as salva por inteiro */
  horarios: HorarioSemanal[]
}

export interface TurmaAluno {
  id: Id
  turmaId: Id
  alunoId: Id
  /** item de contrato que paga a participação */
  contratoItemId?: Id
  dataEntrada: string
  /** vazio = ainda está na turma */
  dataSaida?: string
}

export interface Agendamento {
  id: Id
  tipo: TipoAgendamento
  espacoId: Id
  /** só em AULA (em AULA_TURMA vem da turma) */
  modalidadeId?: Id
  /** responsável pela locação; nas aulas, alunos e professor ficam nos participantes */
  pessoaId?: Id
  turmaId?: Id
  /** 'YYYY-MM-DDTHH:mm:ss' */
  dataInicio: string
  /** 'YYYY-MM-DDTHH:mm:ss' */
  dataFim: string
  /** LOCACAO: valor combinado (sugerido pela tabela de preços, editável para desconto) */
  valor?: number
  status: StatusAgendamento
  observacao?: string
  /** linhas de participantes_agendamento; trafegam junto com o agendamento */
  participantes: ParticipanteAgendamento[]
}

export interface ParticipanteAgendamento {
  id: Id
  pessoaId: Id
  papel: PapelParticipante
  /** de qual item de contrato a aula é descontada */
  contratoItemId?: Id
  presenca: Presenca
}

export interface CategoriaDespesa {
  id: Id
  nome: string
  ativo: boolean
}

/** Conta a receber (RECEITA) ou a pagar (DESPESA). "Vencida" é derivado: ABERTA com vencimento passado. */
export interface Transacao {
  id: Id
  tipo: TipoTransacao
  /** RECEITA: quem paga (obrigatório); DESPESA: a quem se paga (opcional) */
  pessoaId?: Id
  /** só DESPESA */
  categoriaId?: Id
  /** linhas de movimentos; trafegam junto com a transação */
  movimentos: Movimento[]
  /** soma dos movimentos */
  valorTotal: number
  /** criação */
  data: string
  dataVencimento: string
  formaPagamentoId?: Id
  dataPagamento?: string
  /** ex.: motivo do cancelamento */
  observacao?: string
  status: StatusTransacao
}

/** Item de uma transação; em receitas, aponta para a origem (no máximo uma). */
export interface Movimento {
  id: Id
  servicoId?: Id
  agendamentoId?: Id
  contratoItemId?: Id
  /** só mensalidade: 'YYYY-MM' */
  competencia?: string
  descricao: string
  quantidade: number
  valorUnitario: number
  valorTotal: number
}
