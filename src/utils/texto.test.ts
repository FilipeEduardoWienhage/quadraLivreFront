import { expect, it } from 'vitest'
import { contemTermo } from './texto'

it('ignora acentos e maiúsculas', () => {
  expect(contemTermo('jose', 'José da Silva')).toBe(true)
  expect(contemTermo('AÇÃO', 'reação')).toBe(true)
})

it('basta um dos campos conter o termo; campos vazios são ignorados', () => {
  expect(contemTermo('9999', 'Carlos', undefined, '(47) 99999-1001')).toBe(true)
  expect(contemTermo('maria', 'Carlos', undefined)).toBe(false)
})

it('termo vazio (ou só espaços) aceita tudo', () => {
  expect(contemTermo('   ', 'qualquer coisa')).toBe(true)
})
