// Simula as regras do servidor para o financeiro (ver transacoes em docs/modelagem.md).
import type { DadosTransacao, TransacoesApi } from '../api'
import type { Contrato, Id, Transacao } from '../../types/models'
import { diasCobrados, ratear } from '../../utils/contrato'
import { hojeIso } from '../../utils/data'
import { arredondarMoeda, formatarCompetencia, formatarMoeda } from '../../utils/formatar'
import { omitir } from '../../utils/objeto'
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
  // devolução é identificada pela origem: dispensa categoria
  if (dados.tipo === 'DESPESA' && !dados.categoriaId && !dados.origemId) throw new Error('Informe a categoria da despesa.')
  return transacoesBase.criar({
    ...(await completar(dados)),
    data: new Date().toISOString().slice(0, 19),
    status: 'ABERTA',
  })
}

/**
 * Mensalidade de um contrato numa competência ('YYYY-MM'), ou null se ele não esteve ativo no mês.
 * Proporcional no 1º mês (`proporcional`); no último, se proporcional, cobra o `valorFinal` definido
 * pelo gestor. Vence no dia de vencimento, ou no início do contrato se ele começou depois desse dia.
 */
function montarMensalidade(contrato: Contrato, competencia: string, nomePlano: Map<Id, string>) {
  const [ano, mes] = competencia.split('-').map(Number)
  const diasNoMes = new Date(ano, mes, 0).getDate()
  const inicioMes = `${competencia}-01`
  const fimMes = `${competencia}-${diasNoMes}`
  if (contrato.dataInicio > fimMes || (contrato.dataFim && contrato.dataFim < inicioMes)) return null

  const { dias } = diasCobrados(contrato, competencia)
  const sufixo = dias < diasNoMes ? ` (proporcional: ${dias} de ${diasNoMes} dias)` : ''
  const valores =
    contrato.valorFinal !== undefined && contrato.dataFim?.startsWith(competencia)
      ? ratear(contrato.valorFinal, contrato.itens.map((i) => i.valor))
      : contrato.itens.map((i) => arredondarMoeda((i.valor * dias) / diasNoMes))

  const vencimentoNoMes = `${competencia}-${String(Math.min(contrato.diaVencimento ?? 1, diasNoMes)).padStart(2, '0')}`
  return {
    dataVencimento: vencimentoNoMes < contrato.dataInicio ? contrato.dataInicio : vencimentoNoMes,
    movimentos: contrato.itens.map((item, i) => ({
      contratoItemId: item.id,
      competencia,
      descricao: `${nomePlano.get(item.planoId) ?? 'Mensalidade'} — ${formatarCompetencia(competencia)}${sufixo}`,
      quantidade: 1,
      valorUnitario: valores[i],
    })),
  }
}

async function nomesDosPlanos() {
  return new Map((await planosApi.listar()).map((p) => [p.id, p.nome]))
}

/**
 * Mensalidades da competência ('YYYY-MM') ainda não geradas: de todo contrato mensal que esteve
 * ativo em algum dia do mês — inclusive os já encerrados ou cancelados nele.
 */
export async function mensalidadesPendentes(competencia: string) {
  const [contratos, nomePlano, transacoes] = await Promise.all([
    contratosBase.listar(),
    nomesDosPlanos(),
    transacoesBase.listar(),
  ])

  // inclui canceladas: cancelar uma mensalidade não deve fazê-la renascer (unique codcit + competência)
  const jaGerados = new Set(
    transacoes.flatMap((t) => t.movimentos.filter((m) => m.competencia === competencia).map((m) => m.contratoItemId)),
  )

  return contratos
    .filter((c) => c.tipo === 'MENSAL')
    .flatMap((contrato) => {
      const mensalidade = montarMensalidade(contrato, competencia, nomePlano)
      const movimentos = mensalidade?.movimentos.filter((m) => !jaGerados.has(m.contratoItemId))
      return mensalidade && movimentos?.length ? [{ contrato, dataVencimento: mensalidade.dataVencimento, movimentos }] : []
    })
}

async function gerarMensalidades(competencia: string) {
  const pendentes = await mensalidadesPendentes(competencia)
  for (const { contrato, dataVencimento, movimentos } of pendentes) {
    await criarTransacao({ tipo: 'RECEITA', pessoaId: contrato.alunoId, dataVencimento, movimentos })
  }
  return pendentes.length
}

/**
 * Contrato mensal encerrado/cancelado: a mensalidade em aberto do mês do fim passa a refletir a
 * cobrança final escolhida; as em aberto de meses seguintes são canceladas. Pagas ficam como estão.
 */
export async function ajustarMensalidadesAoFinalizar(contrato: Contrato) {
  if (contrato.tipo !== 'MENSAL' || !contrato.dataFim) return
  const competenciaFim = contrato.dataFim.slice(0, 7)
  const itens = new Set(contrato.itens.map((i) => i.id))
  const nomePlano = await nomesDosPlanos()

  for (const transacao of await transacoesBase.listar()) {
    const competencia = transacao.movimentos.find((m) => m.competencia && itens.has(m.contratoItemId ?? 0))?.competencia
    if (transacao.status !== 'ABERTA' || !competencia || competencia < competenciaFim) continue

    if (competencia > competenciaFim) {
      await transacoesApi.cancelar(transacao.id, 'Contrato encerrado antes deste mês.')
      continue
    }
    const recalculada = montarMensalidade(contrato, competencia, nomePlano)
    if (!recalculada) continue
    await transacoesApi.atualizar(transacao.id, {
      ...omitir(transacao, 'id', 'movimentos', 'valorTotal', 'data', 'status', 'formaPagamentoId', 'dataPagamento'),
      movimentos: transacao.movimentos.map((m) => {
        const novo = recalculada.movimentos.find((r) => r.contratoItemId === m.contratoItemId)
        return novo ? { ...novo, id: m.id } : m
      }),
    })
  }
}

/** Quanto de uma receita paga ainda pode ser devolvido (descontadas as devoluções não canceladas). */
export async function valorDevolvivel(origemId: Id) {
  const [original, todas] = await Promise.all([transacoesBase.buscar(origemId), transacoesBase.listar()])
  const devolvido = todas
    .filter((t) => t.origemId === origemId && t.status !== 'CANCELADA')
    .reduce((soma, t) => soma + t.valorTotal, 0)
  return arredondarMoeda(original.valorTotal - devolvido)
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
  async registrarDevolucao(id, { valor, motivo, dataVencimento }) {
    const original = await transacoesBase.buscar(id)
    if (original.tipo !== 'RECEITA' || original.status !== 'PAGA') throw new Error('Só receitas pagas podem ter devolução.')
    if (!motivo.trim()) throw new Error('Informe o motivo da devolução.')
    const restante = await valorDevolvivel(id)
    if (valor <= 0 || valor > restante) {
      throw new Error(`A devolução deve ser de R$ 0,01 até ${formatarMoeda(restante)} (o que ainda não foi devolvido).`)
    }
    return criarTransacao({
      tipo: 'DESPESA',
      pessoaId: original.pessoaId,
      origemId: id,
      dataVencimento,
      observacao: motivo.trim(),
      movimentos: [
        { descricao: `Devolução — ${original.movimentos[0]?.descricao ?? 'cobrança'}`, quantidade: 1, valorUnitario: valor },
      ],
    })
  },
  gerarMensalidades,
}
