import type { ReactNode } from 'react'
import './BarraFiltros.css'

/** Linha de filtros acima de uma tabela; o primeiro filho (busca) ocupa o espaço livre. */
export default function BarraFiltros({ children }: { children: ReactNode }) {
  return (
    <div className="barra-filtros" role="search">
      {children}
    </div>
  )
}
