import type { Id } from '../types/models'

/** Cadastro → opção de um <Selecao> (valor = id, rótulo = nome). Uso: `lista.map(paraOpcao)`. */
export function paraOpcao(item: { id: Id; nome: string }) {
  return { valor: item.id, rotulo: item.nome }
}
