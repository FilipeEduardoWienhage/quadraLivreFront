// Executado antes de cada arquivo de teste unitário.
import { afterEach, beforeEach, vi } from 'vitest'

/**
 * "Hoje" fixo nos testes: segunda-feira, 12/10/2026, 10:00 — o mesmo dia dos dados mock.
 * Só o Date é falsificado; os timers continuam reais (a latência do mock é zero nos testes).
 */
const AGORA = new Date(2026, 9, 12, 10, 0)

beforeEach(() => {
  vi.useFakeTimers({ now: AGORA, toFake: ['Date'] })
})

afterEach(() => {
  vi.useRealTimers()
})
