import type {
  Agendamento,
  CobrancaFinal,
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

export interface Finalizacao {
  status: 'ENCERRADO' | 'CANCELADO'
  /** MENSAL: como cobrar o último mês (obrigatório para mensal) */
  cobrancaFinal?: CobrancaFinal
  /** PROPORCIONAL: total a cobrar no último mês (obrigatório), até o valor integral */
  valorFinal?: number
}

export interface ContratosApi extends Recurso<Contrato, DadosContrato> {
  /**
   * POST /contratos/{id}/encerrar|cancelar — fim hoje. MENSAL: a mensalidade em aberto do mês
   * do fim é ajustada à cobrança final escolhida; as em aberto de meses seguintes são canceladas.
   */
  finalizar(id: Id, finalizacao: Finalizacao): Promise<Contrato>
}

/** O servidor calcula os totais. */
export type DadosMovimento = Omit<Movimento, 'id' | 'valorTotal'> & { id?: Id }

/** O servidor preenche data, status e totais; pagamento só pelas ações próprias. */
export type DadosTransacao = Omit<
  Transacao,
  'id' | 'movimentos' | 'valorTotal' | 'data' | 'status' | 'formaPagamentoId' | 'dataPagamento'
> & { movimentos: DadosMovimento[] }

export interface Devolucao {
  valor: number
  motivo: string
  /** 'YYYY-MM-DD': quando o dinheiro deve sair */
  dataVencimento: string
}

export interface TransacoesApi extends Recurso<Transacao, DadosTransacao> {
  /** POST /transacoes/{id}/pagamento — só integral, só transação ABERTA */
  registrarPagamento(id: Id, pagamento: { formaPagamentoId: Id; dataPagamento: string }): Promise<Transacao>
  /** POST /transacoes/{id}/cancelamento — só transação ABERTA */
  cancelar(id: Id, motivo: string): Promise<Transacao>
  /**
   * POST /transacoes/{id}/devolucao — só RECEITA PAGA; valor até o que ainda não foi devolvido.
   * Cria uma DESPESA ligada à original (origemId), em aberto até o dinheiro sair.
   */
  registrarDevolucao(id: Id, devolucao: Devolucao): Promise<Transacao>
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

/** Status começa AGENDADO no servidor; dataOriginal é controlada por ele. */
export type DadosAgendamento = Omit<Agendamento, 'id' | 'status' | 'participantes' | 'dataOriginal'> & {
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
  /**
   * PUT /agendamentos/{id} — mesmas validações da criação (ignorando o próprio agendamento).
   * O tipo não muda; participantes que continuam mantêm a presença; LOCACAO atualiza a cobrança
   * em aberto (e recusa mudar valor ou responsável se ela já foi paga).
   */
  atualizar(id: Id, dados: DadosAgendamento): Promise<Agendamento>
  /**
   * POST /agendamentos/{id}/cancelamento — LOCACAO cancela junto a cobrança em aberto;
   * se ela já foi paga e `devolver`, registra a devolução do valor pago.
   */
  cancelar(id: Id, motivo: string, opcoes?: { devolver?: boolean }): Promise<Agendamento>
  /** PUT /agendamentos/{id}/participantes/{participanteId}/presenca */
  registrarPresenca(id: Id, participanteId: Id, presenca: Presenca): Promise<Agendamento>
  /** GET /contratos-itens/{id}/uso?data= — aulas usadas na semana (mensal) ou no total (pacote) */
  consultarCota(contratoItemId: Id, data: string): Promise<Cota>
}

export interface PacoteTerminando {
  contratoId: Id
  alunoId: Id
  planoId: Id
  /** aulas ainda não marcadas (as já agendadas contam como usadas) */
  restantes: number
  /** 'YYYY-MM-DD': fim da validade do pacote */
  validade: string
}

/** O que o painel inicial mostra além da agenda do dia: dinheiro do mês e pendências. */
export interface ResumoPainel {
  /** receitas pagas no mês */
  recebidoNoMes: number
  /** receitas não canceladas com vencimento no mês */
  previstoNoMes: number
  /** receitas em aberto já vencidas, das mais antigas para as mais novas */
  cobrancasVencidas: Transacao[]
  /** aulas dos últimos dias, já terminadas, com presença de aluno não registrada (mais recentes primeiro) */
  presencasPendentes: Agendamento[]
  /** pacotes ativos com poucas aulas restantes ou validade perto do fim */
  pacotesTerminando: PacoteTerminando[]
  /** devoluções ainda não pagas */
  devolucoesEmAberto: Transacao[]
  /** contratos mensais ativos ainda sem a mensalidade do mês atual */
  mensalidadesNaoGeradas: number
}

export interface PainelApi {
  /** GET /painel — calculado no servidor, para a tela não precisar carregar tudo */
  resumo(): Promise<ResumoPainel>
}
