import { Campo, Entrada, ModalMotivo } from '../../components'
import type { Transacao } from '../../types/models'
import { formatarData, formatarMoeda } from '../../utils/formatar'

interface Props {
  transacao: Transacao
  onSalvar: (motivo: string) => Promise<void>
  onFechar: () => void
}

/** Cancelamento com motivo obrigatório: transações não são excluídas, para manter o histórico. */
export default function ModalCancelamento({ transacao, onSalvar, onFechar }: Props) {
  return (
    <ModalMotivo
      titulo={transacao.tipo === 'RECEITA' ? 'Cancelar cobrança' : 'Cancelar despesa'}
      textoConfirmar="Cancelar transação"
      mensagemSucesso="Transação cancelada."
      onConfirmar={onSalvar}
      onFechar={onFechar}
    >
      <Campo rotulo="Transação">
        <Entrada
          value={`${formatarMoeda(transacao.valorTotal)} — vence em ${formatarData(transacao.dataVencimento)}`}
          readOnly
        />
      </Campo>
    </ModalMotivo>
  )
}
