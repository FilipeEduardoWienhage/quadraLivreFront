import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { ToastContexto, type ToastApi, type TipoToast } from './toastContexto'
import './Toast.css'

interface ItemToast {
  id: number
  tipo: TipoToast
  mensagem: string
}

const DURACAO_MS: Record<TipoToast, number> = {
  sucesso: 4000,
  info: 4000,
  erro: 7000,
}

const ICONE: Record<TipoToast, string> = {
  sucesso: '✓',
  erro: '!',
  info: 'i',
}

/** Envolve a aplicação e renderiza os toasts; use o hook useToast para exibi-los. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ItemToast[]>([])
  const proximoId = useRef(1)

  const remover = useCallback((id: number) => {
    setToasts((atual) => atual.filter((t) => t.id !== id))
  }, [])

  const mostrar = useCallback(
    (tipo: TipoToast, mensagem: string) => {
      const id = proximoId.current++
      setToasts((atual) => [...atual, { id, tipo, mensagem }])
      setTimeout(() => remover(id), DURACAO_MS[tipo])
    },
    [remover],
  )

  const api = useMemo<ToastApi>(
    () => ({
      sucesso: (m) => mostrar('sucesso', m),
      erro: (m) => mostrar('erro', m),
      info: (m) => mostrar('info', m),
    }),
    [mostrar],
  )

  return (
    <ToastContexto.Provider value={api}>
      {children}
      {createPortal(
        <div className="toasts">
          {toasts.map((t) => (
            <div key={t.id} className={`toast toast-${t.tipo}`} role={t.tipo === 'erro' ? 'alert' : 'status'}>
              <span className="toast-icone" aria-hidden="true">
                {ICONE[t.tipo]}
              </span>
              <span className="toast-mensagem">{t.mensagem}</span>
              <button type="button" className="toast-fechar" onClick={() => remover(t.id)} aria-label="Fechar">
                ×
              </button>
            </div>
          ))}
        </div>,
        document.body,
      )}
    </ToastContexto.Provider>
  )
}
