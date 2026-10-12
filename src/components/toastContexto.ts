import { createContext } from 'react'

export type TipoToast = 'sucesso' | 'erro' | 'info'

export interface ToastApi {
  sucesso(mensagem: string): void
  erro(mensagem: string): void
  info(mensagem: string): void
}

export const ToastContexto = createContext<ToastApi | null>(null)
