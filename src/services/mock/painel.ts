// Simula o resumo do painel inicial, calculado pelo servidor (ver docs/modelagem.md).
import { DIAS_PRESENCA_PENDENTE, PACOTE_AULAS_RESTANTES_ALERTA, PACOTE_DIAS_VALIDADE_ALERTA } from '../../config'
import type { Transacao } from '../../types/models'
import { hojeIso, somarDias } from '../../utils/data'
import { arredondarMoeda } from '../../utils/formatar'
import type { PacoteTerminando, PainelApi } from '../api'
import { agendamentosApi } from './agenda'
import { mensalidadesPendentes } from './financeiro'
import { contratosBase, transacoesBase } from './recursos'

const soma = (transacoes: Transacao[]) => arredondarMoeda(transacoes.reduce((total, t) => total + t.valorTotal, 0))

/** 'YYYY-MM-DDTHH:mm:ss' do momento atual, no fuso local (como as datas dos agendamentos). */
function agoraIso() {
  const agora = new Date()
  return `${hojeIso()}T${agora.toTimeString().slice(0, 8)}`
}

export const painelApi: PainelApi = {
  async resumo() {
    const hoje = hojeIso()
    const agora = agoraIso()
    const mes = hoje.slice(0, 7)

    // os dias passados vêm pela agenda, que garante os encontros de turma gerados
    const dias = Array.from({ length: DIAS_PRESENCA_PENDENTE + 1 }, (_, i) => somarDias(hoje, -i))
    const [transacoes, contratos, agendamentosRecentes, pendentes] = await Promise.all([
      transacoesBase.listar(),
      contratosBase.listar(),
      Promise.all(dias.map((d) => agendamentosApi.listarDoDia(d))),
      mensalidadesPendentes(mes),
    ])

    const receitas = transacoes.filter((t) => t.tipo === 'RECEITA')

    const presencasPendentes = agendamentosRecentes
      .flat()
      .filter(
        (a) =>
          a.tipo !== 'LOCACAO' &&
          a.status !== 'CANCELADO' &&
          a.dataFim <= agora &&
          a.participantes.some((p) => p.papel === 'ALUNO' && p.presenca === 'PENDENTE'),
      )
      .sort((a, b) => b.dataInicio.localeCompare(a.dataInicio))

    const limiteValidade = somarDias(hoje, PACOTE_DIAS_VALIDADE_ALERTA)
    const pacotes = await Promise.all(
      contratos
        .filter((c) => c.tipo === 'PACOTE' && c.status === 'ATIVO')
        .flatMap((contrato) =>
          contrato.itens.map(async (item): Promise<PacoteTerminando> => {
            const { usadas, limite } = await agendamentosApi.consultarCota(item.id, hoje)
            return {
              contratoId: contrato.id,
              alunoId: contrato.alunoId,
              planoId: item.planoId,
              restantes: Math.max(limite - usadas, 0),
              validade: contrato.dataFim!, // pacote sempre tem fim: início + validade
            }
          }),
        ),
    )
    const pacotesTerminando = pacotes.filter(
      (p) => p.restantes <= PACOTE_AULAS_RESTANTES_ALERTA || p.validade <= limiteValidade,
    )

    return {
      recebidoNoMes: soma(receitas.filter((t) => t.status === 'PAGA' && t.dataPagamento?.startsWith(mes))),
      previstoNoMes: soma(receitas.filter((t) => t.status !== 'CANCELADA' && t.dataVencimento.startsWith(mes))),
      cobrancasVencidas: receitas
        .filter((t) => t.status === 'ABERTA' && t.dataVencimento < hoje)
        .sort((a, b) => a.dataVencimento.localeCompare(b.dataVencimento)),
      presencasPendentes,
      pacotesTerminando,
      devolucoesEmAberto: transacoes.filter((t) => t.origemId && t.status === 'ABERTA'),
      mensalidadesNaoGeradas: pendentes.length,
    }
  },
}
