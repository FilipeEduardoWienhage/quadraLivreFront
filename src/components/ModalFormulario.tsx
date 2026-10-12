import { useId, useState, type FormEvent, type ReactNode } from 'react'
import { mensagemErro } from '../hooks/useRecurso'
import { useToast } from '../hooks/useToast'
import './Campo.css'
import Botao from './Botao'
import Modal from './Modal'

interface Props {
  aberto: boolean
  titulo: string
  onFechar: () => void
  /** chamado no envio; o modal só fecha se não lançar erro */
  onSalvar: () => Promise<void>
  children: ReactNode
  textoSalvar?: string
  largura?: 'pequena' | 'media' | 'grande'
  /** toast exibido quando o salvamento dá certo */
  mensagemSucesso?: string
}

/** Modal com formulário, botões Cancelar/Salvar e toast de sucesso/erro. */
export default function ModalFormulario({
  aberto,
  titulo,
  onFechar,
  onSalvar,
  children,
  textoSalvar = 'Salvar',
  largura,
  mensagemSucesso,
}: Props) {
  const toast = useToast()
  const [salvando, setSalvando] = useState(false)
  // o botão Salvar fica no rodapé, fora do <form>: aponta para ele pelo id
  const idFormulario = useId()

  function fechar() {
    if (!salvando) onFechar()
  }

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setSalvando(true)
    try {
      await onSalvar()
      if (mensagemSucesso) toast.sucesso(mensagemSucesso)
      onFechar()
    } catch (err) {
      toast.erro(mensagemErro(err))
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Modal
      aberto={aberto}
      titulo={titulo}
      onFechar={fechar}
      largura={largura}
      rodape={
        <>
          <Botao variante="secundario" onClick={fechar} disabled={salvando}>
            Cancelar
          </Botao>
          <Botao type="submit" form={idFormulario} carregando={salvando}>
            {textoSalvar}
          </Botao>
        </>
      }
    >
      <form id={idFormulario} className="formulario" onSubmit={enviar}>
        {children}
      </form>
    </Modal>
  )
}
