import { describe, expect, it } from 'vitest'
import { espacos } from '../services/mock/dados'
import { calcularValorLocacao, periodosDoDia } from './precos'

// dados de exemplo: quadras em dia útil 07–18 R$ 80/h e 18–23 R$ 120/h; churrasqueira por período no fim de semana
const quadra1 = espacos.find((e) => e.nome === 'Quadra 1')!
const churrasqueira = espacos.find((e) => e.nome === 'Churrasqueira')!
const sala = espacos.find((e) => e.nome === 'Sala de treino físico')!
const SEGUNDA = 1
const SABADO = 6

describe('calcularValorLocacao — por hora', () => {
  it('cobra a hora da faixa', () => {
    expect(calcularValorLocacao(quadra1, SEGUNDA, '08:00', '09:00')).toEqual({ valor: 80 })
  })

  it('soma cada parte quando atravessa faixas (17h–19h = 1h a 80 + 1h a 120)', () => {
    expect(calcularValorLocacao(quadra1, SEGUNDA, '17:00', '19:00')).toEqual({ valor: 200 })
  })

  it('aceita horário quebrado, proporcional aos minutos (82 min a R$ 80/h)', () => {
    expect(calcularValorLocacao(quadra1, SEGUNDA, '14:00', '15:22')).toEqual({ valor: 109.33 })
  })

  it('recusa horário que sai da tabela', () => {
    expect(calcularValorLocacao(quadra1, SEGUNDA, '22:00', '23:30')).toEqual({
      erro: 'Parte do horário está fora da tabela de preços do espaço.',
    })
  })
})

describe('calcularValorLocacao — por período', () => {
  it('cobra o valor fechado do período exato', () => {
    expect(calcularValorLocacao(churrasqueira, SABADO, '11:00', '16:00')).toEqual({ valor: 200 })
  })

  it('recusa horário que não é um período do dia', () => {
    expect(calcularValorLocacao(churrasqueira, SABADO, '12:00', '16:00')).toEqual({
      erro: 'Escolha um dos períodos disponíveis no dia.',
    })
  })
})

it('calcularValorLocacao recusa espaço não alugável', () => {
  expect(calcularValorLocacao(sala, SEGUNDA, '08:00', '09:00')).toEqual({ erro: 'Sala de treino físico não é alugável.' })
})

it('periodosDoDia devolve só o dia pedido, em ordem de horário', () => {
  expect(periodosDoDia(churrasqueira, SABADO).map((p) => `${p.horaInicio}–${p.horaFim}`)).toEqual(['11:00–16:00', '18:00–23:00'])
  expect(periodosDoDia(churrasqueira, SEGUNDA)).toEqual([])
})
