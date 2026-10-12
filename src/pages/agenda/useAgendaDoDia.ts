import { useCallback, useEffect, useState } from 'react'
import { mensagemErro } from '../../hooks/useRecurso'
import { agendamentosApi } from '../../services'
import type { Agendamento } from '../../types/models'

interface Estado {
  /** dia a que a lista se refere: enquanto difere do pedido, está carregando */
  data: string
  agendamentos: Agendamento[]
  erro: string | null
}

/** Agendamentos de um dia (inclui os encontros de turma), recarregáveis após uma ação. */
export function useAgendaDoDia(data: string) {
  const [estado, setEstado] = useState<Estado>({ data: '', agendamentos: [], erro: null })
  const [versao, setVersao] = useState(0)

  useEffect(() => {
    let ignorar = false
    agendamentosApi
      .listarDoDia(data)
      .then((agendamentos) => !ignorar && setEstado({ data, agendamentos, erro: null }))
      .catch((e: unknown) => !ignorar && setEstado({ data, agendamentos: [], erro: mensagemErro(e) }))
    return () => {
      ignorar = true
    }
  }, [data, versao])

  const recarregar = useCallback(() => setVersao((v) => v + 1), [])

  return {
    agendamentos: estado.data === data ? estado.agendamentos : [],
    carregando: estado.data !== data,
    erro: estado.erro,
    recarregar,
  }
}
