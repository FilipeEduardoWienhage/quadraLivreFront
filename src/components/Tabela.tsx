import type { ReactNode } from 'react'
import type { Id } from '../types/models'
import './Tabela.css'

export interface Coluna<T> {
  titulo: string
  valor: (item: T) => ReactNode
  alinhar?: 'esquerda' | 'centro' | 'direita'
  /** largura CSS, ex.: '120px' ou '20%' */
  largura?: string
}

interface Props<T extends { id: Id }> {
  colunas: Coluna<T>[]
  itens: T[]
  carregando?: boolean
  /** mensagem quando a lista está vazia */
  vazio?: string
  /** botões de cada linha (editar, excluir…) */
  acoes?: (item: T) => ReactNode
}

export default function Tabela<T extends { id: Id }>({
  colunas,
  itens,
  carregando = false,
  vazio = 'Nenhum registro encontrado.',
  acoes,
}: Props<T>) {
  const totalColunas = colunas.length + (acoes ? 1 : 0)

  return (
    <div className="tabela-container">
      <table className="tabela">
        <thead>
          <tr>
            {colunas.map((c) => (
              <th key={c.titulo} className={`alinhar-${c.alinhar ?? 'esquerda'}`} style={{ width: c.largura }}>
                {c.titulo}
              </th>
            ))}
            {acoes && <th className="alinhar-direita tabela-acoes">Ações</th>}
          </tr>
        </thead>
        <tbody>
          {carregando ? (
            <tr>
              <td colSpan={totalColunas} className="tabela-mensagem">
                Carregando…
              </td>
            </tr>
          ) : itens.length === 0 ? (
            <tr>
              <td colSpan={totalColunas} className="tabela-mensagem">
                {vazio}
              </td>
            </tr>
          ) : (
            itens.map((item) => (
              <tr key={item.id}>
                {colunas.map((c) => (
                  <td key={c.titulo} className={`alinhar-${c.alinhar ?? 'esquerda'}`}>
                    {c.valor(item)}
                  </td>
                ))}
                {acoes && (
                  <td className="alinhar-direita tabela-acoes">
                    <div className="tabela-acoes-botoes">{acoes(item)}</div>
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
