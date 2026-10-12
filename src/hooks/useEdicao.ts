import { useCallback, useState } from 'react'
import type { Id } from '../types/models'
import { omitir } from '../utils/objeto'

function semId<T extends { id: Id }, F>(item: T): F {
  return omitir(item, 'id') as unknown as F
}

/**
 * Estado do modal de cadastro/edição: abre vazio para "novo" ou preenchido
 * com o item para "editar", e mantém os valores do formulário.
 */
export function useEdicao<T extends { id: Id }, F extends object>(
  vazio: F,
  paraFormulario: (item: T) => F = semId,
) {
  const [aberto, setAberto] = useState(false)
  const [editando, setEditando] = useState<T | null>(null)
  const [valores, setValores] = useState<F>(vazio)

  const alterar = useCallback(<K extends keyof F>(campo: K, valor: F[K]) => {
    setValores((atual) => ({ ...atual, [campo]: valor }))
  }, [])

  const abrirNovo = useCallback(() => {
    setEditando(null)
    setValores(vazio)
    setAberto(true)
  }, [vazio])

  const abrirEdicao = useCallback(
    (item: T) => {
      setEditando(item)
      setValores(paraFormulario(item))
      setAberto(true)
    },
    [paraFormulario],
  )

  const fechar = useCallback(() => setAberto(false), [])

  return { aberto, editando, valores, alterar, abrirNovo, abrirEdicao, fechar }
}
