// Simula as regras do servidor para o financeiro (ver transacoes em docs/modelagem.md).
import type { DadosTransacao, TransacoesApi } from '../api'
import type { Transacao } from '../../types/models'
import { hojeIso } from '../../utils/data'
import { arredondarMoeda, formatarCompetencia } from '../../utils/formatar'
import { numerarNovos } from './numerar'
import { contratosBase, planosApi, transacoesBase } from './recursos'

async function exigirAberta(id: number): Promise<Transacao> {
  const transacao = await transacoesBase.buscar(id)
  if (transacao.status !== 'ABERTA') throw new Error('Só transações em aberto podem ser alteradas.')
  return transacao
}

/** Calcula totais e numera os movimentos novos, como o servidor faria. */
async function completar(dados: DadosTransacao) {
  const todas = await transacoesBase.listar()
  const movimentos = numerarNovos(
    dados.movimentos.map((m) => ({ ...m, valorTotal: arredondarMoeda(m.quantidade * m.valorUnitario) })),
    todas.flatMap((t) => t.movimentos.map((m) => m.id)),
  )
  const valorTotal = arredondarMoeda(movimentos.reduce((soma, m) => soma + m.valorTotal, 0))
  return { ...dados, movimentos, valorTotal }
}

export async function criarTransacao(dados: DadosTransacao): Promise<Transacao> {
  if (dados.movimentos.length === 0) throw new Error('Inclua ao menos um item.')
  if (dados.tipo === 'RECEITA' && !dados.pessoaId) throw new Error('Informe quem paga.')
  if (dados.tipo === 'DESPESA' && !dados.categoriaId) throw new Error('Informe a categoria da despesa.')
  return transacoesBase.criar({
    ...(await completar(dados)),
    data: new Date().toISOString().slice(0, 19),
    status: 'ABERTA',
  })
}

/** Gera as mensalidades da competência ('YYYY-MM') para contratos mensais ativos. */
async function gerarMensalidades(competencia: string) {
  const [ano, mes] = competencia.split('-').map(Number)
  const diasNoMes = new Date(ano, mes, 0).getDate()
  const inicioMes = `${competencia}-01`
  const fimMes = `${competencia}-${diasNoMes}`

  const [contratos, planos, transacoes] = await Promise.all([
    contratosBase.listar(),
    planosApi.listar(),
    transacoesBase.listar(),
  ])
  const nomePlano = new Map(planos.map((p) => [p.id, p.nome]))

  // inclui canceladas: cancelar uma mensalidade não deve fazê-la renascer (unique codcit + competência)
  const jaGerados = new Set(
    transacoes.flatMap((t) => t.movimentos.filter((m) => m.competencia === competencia).map((m) => m.contratoItemId)),
  )

  let criadas = 0
  for (const contrato of contratos) {
    if (contrato.tipo !== 'MENSAL' || contrato.status !== 'ATIVO' || contrato.dataInicio > fimMes) continue
    const itens = contrato.itens.filter((i) => !jaGerados.has(i.id))
    if (itens.length === 0) continue

    const dia = String(Math.min(contrato.diaVencimento ?? 1, diasNoMes)).padStart(2, '0')
    const vencimentoNoMes = `${competencia}-${dia}`
    const dataVencimento = vencimentoNoMes < contrato.dataInicio ? contrato.dataInicio : vencimentoNoMes

    const diaInicio = Number(contrato.dataInicio.slice(8, 10))
    const proporcional = contrato.proporcional === true && contrato.dataInicio >= inicioMes && diaInicio > 1
    const diasCobrados = proporcional ? diasNoMes - diaInicio + 1 : diasNoMes
    const sufixo = proporcional ? ` (proporcional: ${diasCobrados} de ${diasNoMes} dias)` : ''

    await criarTransacao({
      tipo: 'RECEITA',
      pessoaId: contrato.alunoId,
      dataVencimento,
      movimentos: itens.map((item) => ({
        contratoItemId: item.id,
        competencia,
        descricao: `${nomePlano.get(item.planoId) ?? 'Mensalidade'} — ${formatarCompetencia(competencia)}${sufixo}`,
        quantidade: 1,
        valorUnitario: arredondarMoeda((item.valor * diasCobrados) / diasNoMes),
      })),
    })
    criadas++
  }
  return criadas
}

export const transacoesApi: TransacoesApi = {
  listar: transacoesBase.listar,
  buscar: transacoesBase.buscar,
  criar: criarTransacao,
  async atualizar(id, dados) {
    const atual = await exigirAberta(id)
    return transacoesBase.atualizar(id, { ...atual, ...(await completar(dados)) })
  },
  async excluir() {
    throw new Error('Transações não são excluídas: cancele para manter o histórico.')
  },
  async registrarPagamento(id, { formaPagamentoId, dataPagamento }) {
    const transacao = await exigirAberta(id)
    if (dataPagamento > hojeIso()) throw new Error('A data de pagamento não pode ser futura.')
    return transacoesBase.atualizar(id, { ...transacao, formaPagamentoId, dataPagamento, status: 'PAGA' })
  },
  async cancelar(id, motivo) {
    const transacao = await exigirAberta(id)
    return transacoesBase.atualizar(id, { ...transacao, observacao: motivo, status: 'CANCELADA' })
  },
  gerarMensalidades,
}
