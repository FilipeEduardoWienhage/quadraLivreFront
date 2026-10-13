import { describe, expect, it } from 'vitest'
import { configuracoes } from '../services/mock/dados'
import type { Feriado } from '../types/models'
import { feriadoDoDia, funcionamentoDoDia } from './funcionamento'

const semana = configuracoes.funcionamento // seg–sex 07–23, sáb 08–23, dom 08–20

const feriado = (dados: Partial<Feriado>): Feriado => ({
  id: 1,
  data: '2026-12-25',
  nome: 'Natal',
  anual: true,
  aberto: false,
  ...dados,
})

describe('funcionamentoDoDia', () => {
  it('dia útil, sábado e domingo seguem a semana', () => {
    expect(funcionamentoDoDia(semana, [], '2026-10-12')).toEqual({ aberto: true, abertura: '07:00', fechamento: '23:00' })
    expect(funcionamentoDoDia(semana, [], '2026-10-17')).toEqual({ aberto: true, abertura: '08:00', fechamento: '23:00' })
    expect(funcionamentoDoDia(semana, [], '2026-10-18')).toEqual({ aberto: true, abertura: '08:00', fechamento: '20:00' })
  })

  it('dia da semana marcado como fechado', () => {
    const domingoFechado = semana.map((h) => (h.diaSemana === 0 ? { ...h, aberto: false } : h))
    expect(funcionamentoDoDia(domingoFechado, [], '2026-10-18')).toEqual({ aberto: false })
  })

  it('feriado fechado vence a semana', () => {
    expect(funcionamentoDoDia(semana, [feriado({})], '2026-12-25')).toEqual({ aberto: false, feriado: 'Natal' })
  })

  it('feriado com horário especial', () => {
    const vespera = feriado({ data: '2026-12-24', nome: 'Véspera de Natal', aberto: true, abertura: '08:00', fechamento: '14:00' })
    expect(funcionamentoDoDia(semana, [vespera], '2026-12-24')).toEqual({
      aberto: true,
      abertura: '08:00',
      fechamento: '14:00',
      feriado: 'Véspera de Natal',
    })
  })
})

describe('feriadoDoDia', () => {
  it('anual vale em qualquer ano', () => {
    expect(feriadoDoDia([feriado({})], '2031-12-25')?.nome).toBe('Natal')
  })

  it('de data específica só vale naquele ano', () => {
    const carnaval = feriado({ data: '2026-02-17', nome: 'Carnaval', anual: false })
    expect(feriadoDoDia([carnaval], '2026-02-17')?.nome).toBe('Carnaval')
    expect(feriadoDoDia([carnaval], '2027-02-17')).toBeUndefined()
  })

  it('o de data específica vence o anual no mesmo dia', () => {
    const natal = feriado({})
    const natalAberto = feriado({ id: 2, anual: false, nome: 'Natal (evento)', aberto: true, abertura: '09:00', fechamento: '12:00' })
    expect(feriadoDoDia([natal, natalAberto], '2026-12-25')?.nome).toBe('Natal (evento)')
    expect(feriadoDoDia([natal, natalAberto], '2027-12-25')?.nome).toBe('Natal')
  })
})
