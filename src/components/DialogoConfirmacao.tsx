import { useState, type ReactNode } from 'react'
import { mensagemErro } from '../hooks/useRecurso'
import { useToast } from '../hooks/useToast'
import Botao from './Botao'
import Modal from './Modal'

interface Props {
  aberto: boolean
  titulo: string
  mensagem: ReactNode
  onConfirmar: () => Promise<void>
  onCancelar: () => void
  textoConfirmar?: string
  /** botão que fecha sem executar; troque quando a ação também se chama "Cancelar" */
  textoCancelar?: string
  /** ação destrutiva: botão vermelho */
  perigo?: boolean
  /** toast exibido quando a ação dá certo */
  mensagemSucesso?: string
}

export default function DialogoConfirmacao({
  aberto,
  titulo,
  mensagem,
  onConfirmar,
  onCancelar,
  textoConfirmar = 'Confirmar',
  textoCancelar = 'Cancelar',
  perigo = false,
  mensagemSucesso,
}: Props) {
  const toast = useToast()
  const [executando, setExecutando] = useState(false)

  function cancelar() {
    if (!executando) onCancelar()
  }

  async function confirmar() {
    setExecutando(true)
    try {
      await onConfirmar()
      if (mensagemSucesso) toast.sucesso(mensagemSucesso)
      onCancelar()
    } catch (err) {
      toast.erro(mensagemErro(err))
    } finally {
      setExecutando(false)
    }
  }

  return (
    <Modal
      aberto={aberto}
      titulo={titulo}
      onFechar={cancelar}
      largura="pequena"
      rodape={
        <>
          <Botao variante="secundario" onClick={cancelar} disabled={executando}>
            {textoCancelar}
          </Botao>
          <Botao variante={perigo ? 'perigo' : 'primario'} onClick={confirmar} carregando={executando}>
            {textoConfirmar}
          </Botao>
        </>
      }
    >
      <p className="modal-texto">{mensagem}</p>
    </Modal>
  )
}
