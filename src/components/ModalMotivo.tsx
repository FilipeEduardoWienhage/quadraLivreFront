import { useState, type ReactNode } from 'react'
import { AreaTexto, Campo } from './Campo'
import ModalFormulario from './ModalFormulario'

interface Props {
  titulo: string
  textoConfirmar: string
  mensagemSucesso: string
  /** recebe o motivo já sem espaços nas pontas */
  onConfirmar: (motivo: string) => Promise<void>
  onFechar: () => void
  /** conteúdo acima do motivo: aviso, resumo do que será cancelado… */
  children?: ReactNode
}

/** Ação que exige justificativa (ex.: cancelar), registrada para o histórico. */
export default function ModalMotivo({ titulo, textoConfirmar, mensagemSucesso, onConfirmar, onFechar, children }: Props) {
  const [motivo, setMotivo] = useState('')

  return (
    <ModalFormulario
      aberto
      titulo={titulo}
      textoSalvar={textoConfirmar}
      mensagemSucesso={mensagemSucesso}
      largura="pequena"
      onFechar={onFechar}
      onSalvar={() => onConfirmar(motivo.trim())}
    >
      {children}
      <Campo rotulo="Motivo" obrigatorio>
        <AreaTexto value={motivo} onChange={(e) => setMotivo(e.target.value)} required autoFocus />
      </Campo>
    </ModalFormulario>
  )
}
