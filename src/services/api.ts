import type {
  Agendamento,
  Configuracoes,
  Contrato,
  ContratoItem,
  Id,
  Movimento,
  ParticipanteAgendamento,
  Pessoa,
  Presenca,
  Transacao,
} from '../types/models'

/** Dados enviados para criar/atualizar: por padrão, a entidade sem o id. */
export type Dados<T> = Omit<T, 'id'>

/**
 * Contrato de acesso a um recurso da API.
 * Hoje é implementado por mock (services/mock); quando o backend existir,
 * basta uma implementação com fetch que siga a mesma interface.
 *
 * `D` é o que o cliente envia; difere de `Dados<T>` quando o servidor
 * preenche campos sozinho (ex.: dataCadastro).
 */
export interface Recurso<T extends { id: Id }, D = Dados<T>> {
  listar(): Promise<T[]>
  buscar(id: Id): Promise<T>
  criar(dados: D): Promise<T>
  atualizar(id: Id, dados: D): Promise<T>
  excluir(id: Id): Promise<void>
}

/** O servidor preenche dataCadastro. */
export type DadosPessoa = Omit<Pessoa, 'id' | 'dataCadastro'>

/** Item enviado: com id, é um item que já existia; sem id, um item novo. */
export type DadosContratoItem = Omit<ContratoItem, 'id'> & { id?: Id }
export type DadosContrato = Omit<Contrato, 'id' | 'itens'> & { itens: DadosContratoItem[] }

export interface ContratosApi extends Recurso<Contrato, DadosContrato> {
  /** POST /contratos/{id}/encerrar|cancelar */
  finalizar(id: Id, status: 'ENCERRADO' | 'CANCELADO'): Promise<Contrato>
}

/** O servidor calcula os totais. */
export type DadosMovimento = Omit<Movimento, 'id' | 'valorTotal'> & { id?: Id }

/** O servidor preenche data, status e totais; pagamento só pelas ações próprias. */
export type DadosTransacao = Omit<
  Transacao,
  'id' | 'movimentos' | 'valorTotal' | 'data' | 'status' | 'formaPagamentoId' | 'dataPagamento'
> & { movimentos: DadosMovimento[] }

export interface TransacoesApi extends Recurso<Transacao, DadosTransacao> {
  /** POST /transacoes/{id}/pagamento — só integral, só transação ABERTA */
  registrarPagamento(id: Id, pagamento: { formaPagamentoId: Id; dataPagamento: string }): Promise<Transacao>
  /** POST /transacoes/{id}/cancelamento — só transação ABERTA */
  cancelar(id: Id, motivo: string): Promise<Transacao>
  /** POST /mensalidades/{competencia} — no backend real, rotina diária. Devolve quantas cobranças criou. */
  gerarMensalidades(competencia: string): Promise<number>
}

/** Registro único: GET e PUT /configuracoes. */
export interface ConfiguracoesApi {
  buscar(): Promise<Configuracoes>
  salvar(configuracoes: Configuracoes): Promise<Configuracoes>
}

/** Presença começa PENDENTE no servidor. */
type DadosParticipante = Omit<ParticipanteAgendamento, 'id' | 'presenca'>

/** Status começa AGENDADO no servidor. */
export type DadosAgendamento = Omit<Agendamento, 'id' | 'status' | 'participantes'> & {
  participantes: DadosParticipante[]
}

/** Uso de um item de contrato: mensal conta a semana; pacote conta o total. */
export interface Cota {
  usadas: number
  limite: number
  periodo: 'SEMANA' | 'PACOTE'
}

export interface AgendamentosApi {
  /** GET /agendamentos?data= — inclui os encontros de turma do dia (o servidor os gera a partir dos horários) */
  listarDoDia(data: string): Promise<Agendamento[]>
  /** POST /agendamentos — valida conflitos; LOCACAO já nasce com a cobrança */
  criar(dados: DadosAgendamento): Promise<Agendamento>
  /** POST /agendamentos/{id}/cancelamento — LOCACAO cancela junto a cobrança em aberto */
  cancelar(id: Id, motivo: string): Promise<Agendamento>
  /** PUT /agendamentos/{id}/participantes/{participanteId}/presenca */
  registrarPresenca(id: Id, participanteId: Id, presenca: Presenca): Promise<Agendamento>
  /** GET /contratos-itens/{id}/uso?data= — aulas usadas na semana (mensal) ou no total (pacote) */
  consultarCota(contratoItemId: Id, data: string): Promise<Cota>
}
