import type { Nivel, TipoPlano } from '../types/models'
import { formatarMoeda, pluralizar } from './formatar'

export const niveis: Record<Nivel, string> = {
  INICIANTE: 'Iniciante',
  INTERMEDIARIO: 'Intermediário',
  AVANCADO: 'Avançado',
}

export const opcoesNivel = Object.entries(niveis).map(([valor, rotulo]) => ({ valor, rotulo }))

export const tiposPlano: Record<TipoPlano, string> = {
  PACOTE: 'Pacote',
  MENSAL: 'Mensal',
}

/** qtdAulas significa coisas diferentes conforme o tipo (ver planos em docs/modelagem.md). */
export function descreverAulas(tipo: TipoPlano, qtdAulas: number) {
  return tipo === 'PACOTE' ? pluralizar(qtdAulas, 'aula', 'aulas') : `${qtdAulas}x por semana`
}

/** PACOTE: valor total; MENSAL: valor da mensalidade. */
export function descreverValor(tipo: TipoPlano, valor: number) {
  return formatarMoeda(valor) + (tipo === 'MENSAL' ? '/mês' : '')
}
