import { useCallback, useEffect, useState } from 'react'
import type { Dados, Recurso } from '../services'
import type { Id } from '../types/models'

export function mensagemErro(e: unknown) {
  return e instanceof Error ? e.message : 'Erro inesperado.'
}

/** Carrega a lista de um recurso e expõe salvar/excluir, recarregando a lista depois. */
export function useRecurso<T extends { id: Id }, D = Dados<T>>(api: Recurso<T, D>) {
  const [itens, setItens] = useState<T[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  // `carregando` só é true na primeira carga; depois de salvar/excluir a lista
  // é atualizada sem voltar ao estado de "Carregando…".
  const recarregar = useCallback(async () => {
    try {
      setItens(await api.listar())
      setErro(null)
    } catch (e) {
      setErro(mensagemErro(e))
    }
  }, [api])

  useEffect(() => {
    let ignorar = false
    api
      .listar()
      .then((lista) => !ignorar && setItens(lista))
      .catch((e: unknown) => !ignorar && setErro(mensagemErro(e)))
      .finally(() => !ignorar && setCarregando(false))
    return () => {
      ignorar = true
    }
  }, [api])

  /** Sem id cria; com id atualiza. */
  const salvar = useCallback(
    async (dados: D, id?: Id) => {
      await (id ? api.atualizar(id, dados) : api.criar(dados))
      await recarregar()
    },
    [api, recarregar],
  )

  const excluir = useCallback(
    async (id: Id) => {
      await api.excluir(id)
      await recarregar()
    },
    [api, recarregar],
  )

  return { itens, carregando, erro, recarregar, salvar, excluir }
}
