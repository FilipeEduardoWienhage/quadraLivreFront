import type { ReactNode } from 'react'
import './Etiqueta.css'

export type CorEtiqueta = 'verde' | 'amarelo' | 'vermelho' | 'azul' | 'cinza'

interface Props {
  cor?: CorEtiqueta
  children: ReactNode
}

export default function Etiqueta({ cor = 'cinza', children }: Props) {
  return <span className={`etiqueta etiqueta-${cor}`}>{children}</span>
}
