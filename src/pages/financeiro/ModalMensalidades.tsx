import { useState } from 'react'
import { Campo, Entrada, ModalFormulario } from '../../components'
import { hojeIso } from '../../utils/data'

interface Props {
  /** recebe 'YYYY-MM'; a página avisa o resultado */
  onGerar: (competencia: string) => Promise<void>
  onFechar: () => void
}

/** No backend real isto é uma rotina diária; aqui fica manual para testar o fluxo. */
export default function ModalMensalidades({ onGerar, onFechar }: Props) {
  const [competencia, setCompetencia] = useState(hojeIso().slice(0, 7))

  return (
    <ModalFormulario
      aberto
      titulo="Gerar mensalidades"
      textoSalvar="Gerar"
      largura="pequena"
      onFechar={onFechar}
      onSalvar={() => onGerar(competencia)}
    >
      <Campo
        rotulo="Mês de referência"
        ajuda="Cria uma cobrança por contrato mensal ativo. Meses já gerados não são cobrados de novo."
        obrigatorio
      >
        <Entrada type="month" value={competencia} onChange={(e) => setCompetencia(e.target.value)} required autoFocus />
      </Campo>
    </ModalFormulario>
  )
}
