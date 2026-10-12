import { useEffect, useId, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import './Modal.css'

interface Props {
  aberto: boolean
  titulo: string
  onFechar: () => void
  children: ReactNode
  /** botões do rodapé */
  rodape?: ReactNode
  largura?: 'pequena' | 'media' | 'grande'
}

export default function Modal({ aberto, titulo, onFechar, children, rodape, largura = 'media' }: Props) {
  // id único por modal: dois modais abertos (um sobre o outro) não podem compartilhar o mesmo id
  const idTitulo = useId()

  useEffect(() => {
    if (!aberto) return
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === 'Escape') onFechar()
    }
    document.addEventListener('keydown', aoTeclar)
    return () => document.removeEventListener('keydown', aoTeclar)
  }, [aberto, onFechar])

  if (!aberto) return null

  return createPortal(
    <div className="modal-fundo" onMouseDown={(e) => e.target === e.currentTarget && onFechar()}>
      <div className={`modal modal-${largura}`} role="dialog" aria-modal="true" aria-labelledby={idTitulo}>
        <header className="modal-cabecalho">
          <h2 id={idTitulo}>{titulo}</h2>
          <button type="button" className="modal-fechar" onClick={onFechar} aria-label="Fechar">
            ×
          </button>
        </header>
        <div className="modal-corpo">{children}</div>
        {rodape && <footer className="modal-rodape">{rodape}</footer>}
      </div>
    </div>,
    document.body,
  )
}
