import type { DiaSemana } from '../types/models'

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export function formatarMoeda(valor: number) {
  return moeda.format(valor)
}

/** Contagem com concordância: pluralizar(1, 'aula', 'aulas') → "1 aula"; (3, …) → "3 aulas". */
export function pluralizar(n: number, singular: string, plural: string) {
  return `${n} ${n === 1 ? singular : plural}`
}

/** Arredonda para centavos, evitando resíduos de ponto flutuante (0.1 + 0.2). */
export function arredondarMoeda(valor: number) {
  return Math.round(valor * 100) / 100
}

/** 'YYYY-MM' → 'MM/YYYY' */
export function formatarCompetencia(competencia: string) {
  const [ano, mes] = competencia.split('-')
  return `${mes}/${ano}`
}

/** 'YYYY-MM-DD' ou 'YYYY-MM-DDTHH:mm:ss' → 'DD/MM/YYYY' */
export function formatarData(iso: string) {
  const [ano, mes, dia] = iso.slice(0, 10).split('-')
  return `${dia}/${mes}/${ano}`
}

export const diasSemana: Record<DiaSemana, string> = {
  0: 'Domingo',
  1: 'Segunda',
  2: 'Terça',
  3: 'Quarta',
  4: 'Quinta',
  5: 'Sexta',
  6: 'Sábado',
}
