import { useState } from 'react'
import { AreaTexto, Campo, Entrada, LinhaCampos, ModalFormulario } from '../../components'
import type { Devolucao } from '../../services'
import type { Transacao } from '../../types/models'
import { hojeIso } from '../../utils/data'
import { formatarData, formatarMoeda } from '../../utils/formatar'

interface Props {
  transacao: Transacao
  /** o que ainda não foi devolvido desta receita */
  restante: number
  onSalvar: (devolucao: Devolucao) => Promise<void>
  onFechar: () => void
}

/** Registra que parte (ou todo) o valor de uma receita paga será devolvido — vira uma conta a pagar. */
export default function ModalDevolucao({ transacao, restante, onSalvar, onFechar }: Props) {
  const [valor, setValor] = useState(restante)
  const [motivo, setMotivo] = useState('')
  const [dataVencimento, setDataVencimento] = useState(hojeIso())

  return (
    <ModalFormulario
      aberto
      titulo="Registrar devolução"
      textoSalvar="Registrar devolução"
      mensagemSucesso="Devolução registrada em contas a pagar."
      largura="pequena"
      onFechar={onFechar}
      onSalvar={() => onSalvar({ valor, motivo: motivo.trim(), dataVencimento })}
    >
      <Campo
        rotulo="Receita"
        ajuda={`${formatarMoeda(transacao.valorTotal)} recebidos em ${formatarData(transacao.dataPagamento ?? '')}.`}
      >
        <Entrada value={transacao.movimentos[0]?.descricao ?? ''} readOnly />
      </Campo>
      <LinhaCampos>
        <Campo rotulo="Valor a devolver (R$)" ajuda={`Até ${formatarMoeda(restante)}.`} obrigatorio>
          <Entrada
            type="number"
            min={0.01}
            max={restante}
            step={0.01}
            value={valor || ''}
            onChange={(e) => setValor(Number(e.target.value))}
            required
          />
        </Campo>
        <Campo rotulo="Devolver até" obrigatorio>
          <Entrada type="date" value={dataVencimento} onChange={(e) => setDataVencimento(e.target.value)} required />
        </Campo>
      </LinhaCampos>
      <Campo rotulo="Motivo" obrigatorio>
        <AreaTexto value={motivo} onChange={(e) => setMotivo(e.target.value)} required autoFocus />
      </Campo>
    </ModalFormulario>
  )
}
