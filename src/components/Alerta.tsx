import type { ReactNode } from 'react'
import './Alerta.css'

interface Props {
  /** sucesso de ações vai para o toast; o alerta fica para erros de carga e avisos */
  tipo?: 'erro' | 'info'
  children: ReactNode
}

export default function Alerta({ tipo = 'info', children }: Props) {
  return (
    <div className={`alerta alerta-${tipo}`} role={tipo === 'erro' ? 'alert' : 'status'}>
      {children}
    </div>
  )
}
