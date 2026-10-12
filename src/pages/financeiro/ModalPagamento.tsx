import { useState } from 'react'
import { Campo, Entrada, ModalFormulario, Selecao } from '../../components'
import type { FormaPagamento, Id, Transacao } from '../../types/models'
import { hojeIso } from '../../utils/data'
import { formatarMoeda } from '../../utils/formatar'

interface Props {
  transacao: Transacao
  formas: FormaPagamento[]
  onSalvar: (pagamento: { formaPagamentoId: Id; dataPagamento: string }) => Promise<void>
  onFechar: () => void
}

/** Baixa integral de uma transação em aberto. */
export default function ModalPagamento({ transacao, formas, onSalvar, onFechar }: Props) {
  const hoje = hojeIso()
  const [formaPagamentoId, setFormaPagamentoId] = useState('')
  const [dataPagamento, setDataPagamento] = useState(hoje)
  const receita = transacao.tipo === 'RECEITA'

  return (
    <ModalFormulario
      aberto
      titulo={receita ? 'Registrar recebimento' : 'Registrar pagamento'}
      textoSalvar={receita ? 'Confirmar recebimento' : 'Confirmar pagamento'}
      mensagemSucesso={receita ? 'Recebimento registrado.' : 'Pagamento registrado.'}
      largura="pequena"
      onFechar={onFechar}
      onSalvar={() => onSalvar({ formaPagamentoId: Number(formaPagamentoId), dataPagamento })}
    >
      <Campo rotulo="Valor" ajuda="Pagamento integral: a transação fica quitada.">
        <Entrada value={formatarMoeda(transacao.valorTotal)} readOnly />
      </Campo>
      <Campo rotulo="Forma de pagamento" obrigatorio>
        <Selecao
          placeholder="Selecione…"
          opcoes={formas.filter((f) => f.ativo).map((f) => ({ valor: f.id, rotulo: f.descricao }))}
          value={formaPagamentoId}
          onChange={(e) => setFormaPagamentoId(e.target.value)}
          required
          autoFocus
        />
      </Campo>
      <Campo rotulo="Data do pagamento" obrigatorio>
        <Entrada
          type="date"
          max={hoje}
          value={dataPagamento}
          onChange={(e) => setDataPagamento(e.target.value)}
          required
        />
      </Campo>
    </ModalFormulario>
  )
}
