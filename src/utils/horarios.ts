import type { HorarioSemanal } from '../types/models'
import { diasSemana } from './formatar'

const abreviar = (h: HorarioSemanal) => diasSemana[h.diaSemana].slice(0, 3)

/** 'HH:mm' → minutos desde 00:00 */
export function minutos(hora: string) {
  const [h, m] = hora.split(':').map(Number)
  return h * 60 + m
}

/** minutos desde 00:00 → 'HH:mm' */
export function paraHora(totalMinutos: number) {
  const h = String(Math.floor(totalMinutos / 60)).padStart(2, '0')
  const m = String(totalMinutos % 60).padStart(2, '0')
  return `${h}:${m}`
}

/**
 * Agrupa dias com o mesmo horário: "Seg, Qua 18:00–19:00".
 * Grupos diferentes são separados por " · ".
 */
export function formatarHorarios(horarios: HorarioSemanal[]) {
  const grupos = new Map<string, HorarioSemanal[]>()
  for (const h of [...horarios].sort((a, b) => a.diaSemana - b.diaSemana)) {
    const faixa = `${h.horaInicio}–${h.horaFim}`
    grupos.set(faixa, [...(grupos.get(faixa) ?? []), h])
  }
  return [...grupos].map(([faixa, hs]) => `${hs.map(abreviar).join(', ')} ${faixa}`).join(' · ')
}

/** Mensagem do primeiro problema encontrado, ou null se os horários são válidos. */
export function validarHorarios(horarios: HorarioSemanal[]): string | null {
  if (horarios.length === 0) return 'Informe ao menos um horário.'

  // 'HH:mm' com zero à esquerda: comparar como texto equivale a comparar as horas
  const invalido = horarios.find((h) => h.horaFim <= h.horaInicio)
  if (invalido) return `${diasSemana[invalido.diaSemana]}: o fim deve ser depois do início.`

  const ordenados = [...horarios].sort(
    (a, b) => a.diaSemana - b.diaSemana || a.horaInicio.localeCompare(b.horaInicio),
  )
  for (let i = 1; i < ordenados.length; i++) {
    const anterior = ordenados[i - 1]
    const atual = ordenados[i]
    if (atual.diaSemana === anterior.diaSemana && atual.horaInicio < anterior.horaFim) {
      return `${diasSemana[atual.diaSemana]}: há horários sobrepostos.`
    }
  }
  return null
}

/**
 * Intervalos livres (em minutos do dia) entre `inicio` e `fim`, descontando os ocupados;
 * só os de pelo menos `minimo` minutos.
 */
export function janelasLivres(ocupados: [number, number][], inicio: number, fim: number, minimo: number) {
  const livres: [number, number][] = []
  let cursor = inicio
  for (const [de, ate] of [...ocupados].sort((a, b) => a[0] - b[0])) {
    if (de - cursor >= minimo) livres.push([cursor, Math.min(de, fim)])
    cursor = Math.max(cursor, ate)
    if (cursor >= fim) break
  }
  if (fim - cursor >= minimo) livres.push([cursor, fim])
  return livres
}
