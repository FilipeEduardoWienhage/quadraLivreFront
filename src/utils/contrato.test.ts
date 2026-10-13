import { describe, expect, it } from 'vitest'
import { diasCobrados, ratear, totalContrato } from './contrato'

it('totalContrato soma os itens', () => {
  expect(totalContrato({ itens: [{ id: 1, planoId: 1, qtdAulas: 1, valor: 940 }, { id: 2, planoId: 2, qtdAulas: 1, valor: 150.1 }] })).toBe(1090.1)
})

describe('diasCobrados', () => {
  const base = { dataInicio: '2026-01-01' }
  it('mês cheio por padrão', () => {
    expect(diasCobrados(base, '2026-10')).toEqual({ dias: 31, diasNoMes: 31 })
  })
  it('1º mês proporcional conta do início', () => {
    expect(diasCobrados({ dataInicio: '2026-11-20', proporcional: true }, '2026-11')).toEqual({ dias: 11, diasNoMes: 30 })
  })
  it('último mês proporcional conta até o fim; integral ignora o fim', () => {
    expect(diasCobrados({ ...base, dataFim: '2026-10-12', cobrancaFinal: 'PROPORCIONAL' }, '2026-10').dias).toBe(12)
    expect(diasCobrados({ ...base, dataFim: '2026-10-12', cobrancaFinal: 'INTEGRAL' }, '2026-10').dias).toBe(31)
  })
})

it('ratear divide pelos pesos e fecha o total exato', () => {
  expect(ratear(100, [600, 200])).toEqual([75, 25])
  expect(ratear(100, [1, 1, 1])).toEqual([33.33, 33.33, 33.34])
})
