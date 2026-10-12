import { useContext } from 'react'
import { ToastContexto } from '../components/toastContexto'

/** Mostra avisos no canto superior direito: toast.sucesso('…'), toast.erro('…'). */
export function useToast() {
  const toast = useContext(ToastContexto)
  if (!toast) throw new Error('useToast precisa estar dentro de <ToastProvider>.')
  return toast
}
