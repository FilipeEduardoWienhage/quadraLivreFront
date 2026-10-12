import type { ReactNode } from 'react'
import './CabecalhoPagina.css'

interface Props {
  titulo: string
  descricao?: string
  /** botões à direita do título */
  acoes?: ReactNode
}

export default function CabecalhoPagina({ titulo, descricao, acoes }: Props) {
  return (
    <header className="cabecalho-pagina">
      <div>
        <h1>{titulo}</h1>
        {descricao && <p className="cabecalho-pagina-descricao">{descricao}</p>}
      </div>
      {acoes && <div className="cabecalho-pagina-acoes">{acoes}</div>}
    </header>
  )
}
