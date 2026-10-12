import type { Id } from '../../types/models'

/**
 * Simula o servidor numerando linhas novas de uma tabela filha (ex.: contratos_itens),
 * que tem sequência própria. Linhas que já têm id são mantidas.
 */
export function numerarNovos<T extends object>(linhas: (T & { id?: Id })[], idsExistentes: Id[]): (T & { id: Id })[] {
  let ultimo = Math.max(0, ...idsExistentes)
  return linhas.map((linha) => ({ ...linha, id: linha.id ?? ++ultimo }))
}
