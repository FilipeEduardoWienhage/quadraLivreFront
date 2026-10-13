import type { DiaSemana } from '../types/models'

/** Date local → 'YYYY-MM-DD' (toISOString usaria UTC e erraria o dia à noite). */
function paraIso(d: Date) {
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mes}-${dia}`
}

/** Data de hoje no fuso local, em 'YYYY-MM-DD'. */
export function hojeIso() {
  return paraIso(new Date())
}

function paraDate(iso: string) {
  const [ano, mes, dia] = iso.slice(0, 10).split('-').map(Number)
  return new Date(ano, mes - 1, dia)
}

/** 'YYYY-MM-DD' + n dias, em 'YYYY-MM-DD'. */
export function somarDias(iso: string, dias: number) {
  const d = paraDate(iso)
  d.setDate(d.getDate() + dias)
  return paraIso(d)
}

/** Dias de 'de' até 'ate' ('YYYY-MM-DD'); negativo se 'ate' vem antes. */
export function diasEntre(de: string, ate: string) {
  // arredonda: a troca de horário de verão deixa um dia com 23 ou 25 horas
  return Math.round((paraDate(ate).getTime() - paraDate(de).getTime()) / 86_400_000)
}

/** Dia da semana de 'YYYY-MM-DD…': 0 = domingo … 6 = sábado. */
export function diaDaSemana(iso: string) {
  return paraDate(iso).getDay() as DiaSemana
}

/** Segunda-feira da semana da data (semana de segunda a domingo), em 'YYYY-MM-DD'. */
export function inicioDaSemana(iso: string) {
  const dia = diaDaSemana(iso)
  return somarDias(iso, dia === 0 ? -6 : 1 - dia)
}

/** Ex.: "Segunda, 12/10/2026" */
export function formatarDiaPorExtenso(iso: string) {
  return paraDate(iso).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })
}
