import { useCallback, useEffect, useState } from 'react'
import { mensagemErro } from '../../hooks/useRecurso'
import { painelApi, type ResumoPainel } from '../../services'

/** Resumo do painel (dinheiro do mês e pendências), recarregável após uma ação. */
export function useResumoPainel() {
  const [resumo, setResumo] = useState<ResumoPainel | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [versao, setVersao] = useState(0)

  useEffect(() => {
    let ignorar = false
    painelApi
      .resumo()
      .then((r) => !ignorar && setResumo(r))
      .catch((e: unknown) => !ignorar && setErro(mensagemErro(e)))
    return () => {
      ignorar = true
    }
  }, [versao])

  const recarregar = useCallback(() => setVersao((v) => v + 1), [])

  return { resumo, erro, recarregar }
}
