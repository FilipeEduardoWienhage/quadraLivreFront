import { useCallback, useEffect, useState } from 'react'
import { configuracoesApi } from '../services'
import type { Configuracoes } from '../types/models'
import { mensagemErro } from './useRecurso'

/** Configurações gerais da academia; `null` enquanto carrega. */
export function useConfiguracoes() {
  const [configuracoes, setConfiguracoes] = useState<Configuracoes | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    let ignorar = false
    configuracoesApi
      .buscar()
      .then((c) => !ignorar && setConfiguracoes(c))
      .catch((e: unknown) => !ignorar && setErro(mensagemErro(e)))
    return () => {
      ignorar = true
    }
  }, [])

  const salvar = useCallback(async (novas: Configuracoes) => {
    setConfiguracoes(await configuracoesApi.salvar(novas))
  }, [])

  return { configuracoes, erro, salvar }
}
