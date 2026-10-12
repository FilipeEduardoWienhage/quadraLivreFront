import { expect, it } from 'vitest'
import { arredondarMoeda, formatarCompetencia, formatarData, formatarMoeda, pluralizar } from './formatar'

it('pluralizar concorda com a quantidade', () => {
  expect(pluralizar(1, 'aula', 'aulas')).toBe('1 aula')
  expect(pluralizar(0, 'aula', 'aulas')).toBe('0 aulas')
  expect(pluralizar(3, 'cobrança vencida', 'cobranças vencidas')).toBe('3 cobranças vencidas')
})

it('arredondarMoeda elimina resíduos de ponto flutuante', () => {
  expect(0.1 + 0.2).not.toBe(0.3)
  expect(arredondarMoeda(0.1 + 0.2)).toBe(0.3)
  expect(arredondarMoeda((680 * 11) / 30)).toBe(249.33)
})

it('formatarMoeda em reais', () => {
  // o Intl separa "R$" do valor com espaço não separável
  expect(formatarMoeda(1090)).toBe('R$\u00a01.090,00')
})

it('formatarData aceita data e data/hora', () => {
  expect(formatarData('2026-10-12')).toBe('12/10/2026')
  expect(formatarData('2026-10-12T08:00:00')).toBe('12/10/2026')
})

it('formatarCompetencia', () => {
  expect(formatarCompetencia('2026-11')).toBe('11/2026')
})
