import { useMemo } from 'react'
import { CartaoResumo } from '../../components'
import type { Transacao } from '../../types/models'
import { formatarCompetencia, formatarMoeda, pluralizar } from '../../utils/formatar'

const soma = (transacoes: Transacao[]) => transacoes.reduce((total, t) => total + t.valorTotal, 0)

interface Props {
  /** todas as transações, sem filtro: os indicadores não mudam com os filtros da lista */
  transacoes: Transacao[]
  /** 'YYYY-MM-DD' */
  hoje: string
}

/** Indicadores do topo do financeiro: a receber, em atraso, recebido no mês e a pagar. */
export default function ResumoFinanceiro({ transacoes, hoje }: Props) {
  const mesAtual = hoje.slice(0, 7)

  const { aReceber, vencidas, recebidas, aPagar } = useMemo(() => {
    const receitas = transacoes.filter((t) => t.tipo === 'RECEITA')
    const emAberto = receitas.filter((t) => t.status === 'ABERTA')
    return {
      aReceber: emAberto,
      vencidas: emAberto.filter((t) => t.dataVencimento < hoje),
      recebidas: receitas.filter((t) => t.status === 'PAGA' && t.dataPagamento?.startsWith(mesAtual)),
      aPagar: transacoes.filter((t) => t.tipo === 'DESPESA' && t.status === 'ABERTA'),
    }
  }, [transacoes, hoje, mesAtual])

  return (
    <div className="financeiro-resumo">
      <CartaoResumo
        rotulo="A receber"
        valor={formatarMoeda(soma(aReceber))}
        detalhe={pluralizar(aReceber.length, 'cobrança', 'cobranças')}
      />
      <CartaoResumo
        rotulo="Em atraso"
        valor={formatarMoeda(soma(vencidas))}
        detalhe={pluralizar(vencidas.length, 'cobrança vencida', 'cobranças vencidas')}
        tom={vencidas.length ? 'alerta' : 'neutro'}
      />
      <CartaoResumo
        rotulo="Recebido no mês"
        valor={formatarMoeda(soma(recebidas))}
        detalhe={formatarCompetencia(mesAtual)}
        tom="positivo"
      />
      <CartaoResumo
        rotulo="A pagar"
        valor={formatarMoeda(soma(aPagar))}
        detalhe={pluralizar(aPagar.length, 'despesa', 'despesas')}
      />
    </div>
  )
}
