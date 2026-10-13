import { describe, expect, it } from 'vitest'
import { diaDaSemana, diasEntre, formatarDiaPorExtenso, hojeIso, inicioDaSemana, somarDias } from './data'

it('hojeIso usa a data local (nos testes, 12/10/2026)', () => {
  expect(hojeIso()).toBe('2026-10-12')
})

describe('somarDias', () => {
  it('atravessa mês e ano', () => {
    expect(somarDias('2026-01-31', 1)).toBe('2026-02-01')
    expect(somarDias('2026-12-31', 1)).toBe('2027-01-01')
  })

  it('pacote de 90 dias a partir de 01/09', () => {
    expect(somarDias('2026-09-01', 90)).toBe('2026-11-30')
  })

  it('aceita dias negativos', () => {
    expect(somarDias('2026-03-01', -1)).toBe('2026-02-28')
  })
})

it('diaDaSemana: 0 = domingo … 6 = sábado (aceita data com hora)', () => {
  expect(diaDaSemana('2026-10-12')).toBe(1)
  expect(diaDaSemana('2026-10-18T08:00:00')).toBe(0)
})

describe('inicioDaSemana (segunda a domingo)', () => {
  it('de uma quarta volta para a segunda', () => {
    expect(inicioDaSemana('2026-10-14')).toBe('2026-10-12')
  })

  it('domingo pertence à semana que começou na segunda anterior', () => {
    expect(inicioDaSemana('2026-10-18')).toBe('2026-10-12')
  })

  it('segunda é o próprio início', () => {
    expect(inicioDaSemana('2026-10-12')).toBe('2026-10-12')
  })
})

it('formatarDiaPorExtenso', () => {
  expect(formatarDiaPorExtenso('2026-10-12')).toBe('segunda-feira, 12/10/2026')
})

it('diasEntre conta dias de calendário, nos dois sentidos', () => {
  expect(diasEntre('2026-10-10', '2026-10-12')).toBe(2)
  expect(diasEntre('2026-10-12', '2026-10-10')).toBe(-2)
  expect(diasEntre('2026-12-31', '2027-01-01')).toBe(1)
})
