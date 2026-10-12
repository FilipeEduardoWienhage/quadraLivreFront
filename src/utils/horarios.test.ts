import { describe, expect, it } from 'vitest'
import type { HorarioSemanal } from '../types/models'
import { formatarHorarios, minutos, paraHora, validarHorarios } from './horarios'

const h = (diaSemana: HorarioSemanal['diaSemana'], horaInicio: string, horaFim: string): HorarioSemanal => ({
  diaSemana,
  horaInicio,
  horaFim,
})

it('minutos e paraHora são inversos', () => {
  expect(minutos('21:22')).toBe(1282)
  expect(paraHora(1282)).toBe('21:22')
  expect(paraHora(minutos('07:05'))).toBe('07:05')
})

describe('formatarHorarios', () => {
  it('agrupa dias com o mesmo horário, em ordem de dia', () => {
    expect(formatarHorarios([h(3, '18:00', '19:00'), h(1, '18:00', '19:00')])).toBe('Seg, Qua 18:00–19:00')
  })

  it('separa horários diferentes', () => {
    expect(formatarHorarios([h(2, '19:00', '20:30'), h(6, '09:00', '10:00')])).toBe('Ter 19:00–20:30 · Sáb 09:00–10:00')
  })
})

describe('validarHorarios', () => {
  it('aceita horários válidos', () => {
    expect(validarHorarios([h(1, '18:00', '19:00'), h(1, '19:00', '20:00')])).toBeNull()
  })

  it('exige ao menos um horário', () => {
    expect(validarHorarios([])).toBe('Informe ao menos um horário.')
  })

  it('exige fim depois do início', () => {
    expect(validarHorarios([h(2, '19:00', '19:00')])).toBe('Terça: o fim deve ser depois do início.')
  })

  it('recusa sobreposição no mesmo dia', () => {
    expect(validarHorarios([h(4, '18:00', '19:30'), h(4, '19:00', '20:00')])).toBe('Quinta: há horários sobrepostos.')
  })

  it('o mesmo horário em dias diferentes não é sobreposição', () => {
    expect(validarHorarios([h(1, '18:00', '19:00'), h(3, '18:00', '19:00')])).toBeNull()
  })
})
