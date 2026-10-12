import { beforeEach, expect, it } from 'vitest'
import { novoServidor } from '../../testes/servidor'

let api: Awaited<ReturnType<typeof novoServidor>>

beforeEach(async () => {
  api = await novoServidor()
})

it('itens novos ganham id sem colidir com os existentes; itens mantidos preservam o id', async () => {
  const contrato = await api.contratosApi.buscar(3) // Juliana: itens 3 e 4
  const ajustado = await api.contratosApi.atualizar(3, {
    ...contrato,
    itens: [...contrato.itens, { planoId: 6, qtdAulas: 2, valor: 300 }],
  })
  expect(ajustado.itens.map((i) => i.id)).toEqual([3, 4, 6])
})

it('encerrar mensal ativo: fim hoje', async () => {
  const encerrado = await api.contratosApi.finalizar(1, 'ENCERRADO')
  expect([encerrado.status, encerrado.dataFim]).toEqual(['ENCERRADO', '2026-10-12'])
})

it('cancelar pacote mantém o fim original se ele já passou; senão, fim hoje', async () => {
  // pacote do Bruno vence em 30/11: ainda não passou
  const cancelado = await api.contratosApi.finalizar(2, 'CANCELADO')
  expect([cancelado.status, cancelado.dataFim]).toEqual(['CANCELADO', '2026-10-12'])
})

it('só contrato ativo pode ser encerrado ou cancelado', async () => {
  await expect(api.contratosApi.finalizar(4, 'CANCELADO')).rejects.toThrow('Só contratos ativos')
})
