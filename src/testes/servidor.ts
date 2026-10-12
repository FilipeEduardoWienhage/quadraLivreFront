import { vi } from 'vitest'

/**
 * Serviços com os dados de exemplo intactos: recarrega os módulos do mock,
 * que guardam os dados em memória (nos testes não há localStorage).
 */
export async function novoServidor() {
  vi.resetModules()
  return import('../services')
}
