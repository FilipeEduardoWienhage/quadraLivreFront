import type { Id } from '../../types/models'
import type { Dados, Recurso } from '../api'

const LATENCIA_MS = 250

/**
 * Aumente a versão ao mudar o formato dos dados mock: o que estiver salvo
 * no navegador com a versão antiga é ignorado e os dados iniciais voltam.
 */
const VERSAO = 9
const PREFIXO = `quadralivre:mock:v${VERSAO}:`

function esperar() {
  return new Promise((resolve) => setTimeout(resolve, LATENCIA_MS))
}

/**
 * Recurso com latência simulada, persistido no localStorage para os dados sobreviverem
 * ao recarregar a página.
 *
 * O localStorage é a fonte da verdade e é lido a cada operação, como um servidor leria o banco.
 * Assim, cópias do módulo coexistindo (o HMR do Vite recarrega módulos em desenvolvimento)
 * ou abas diferentes enxergam os mesmos dados. Sem localStorage, os dados ficam só em memória.
 *
 * `preencher` simula os campos que o servidor completa na criação.
 * Na atualização, campos não enviados são mantidos, como o servidor faria.
 */
export function criarRecursoMock<T extends { id: Id }, D = Dados<T>>(
  nome: string,
  inicial: T[],
  preencher: (dados: D) => Dados<T> = (dados) => dados as unknown as Dados<T>,
): Recurso<T, D> {
  const chave = PREFIXO + nome
  let memoria = structuredClone(inicial)

  function ler(): T[] {
    try {
      const salvo = localStorage.getItem(chave)
      if (salvo) return JSON.parse(salvo) as T[]
    } catch {
      // sem localStorage: usa a memória
    }
    return memoria
  }

  function gravar(itens: T[]) {
    memoria = itens
    try {
      localStorage.setItem(chave, JSON.stringify(itens))
    } catch {
      // sem localStorage: os dados ficam só em memória
    }
  }

  function encontrar(itens: T[], id: Id) {
    const item = itens.find((i) => i.id === id)
    if (!item) throw new Error(`Registro ${id} não encontrado em ${nome}.`)
    return item
  }

  return {
    async listar() {
      await esperar()
      return structuredClone(ler())
    },
    async buscar(id) {
      await esperar()
      return structuredClone(encontrar(ler(), id))
    },
    async criar(dados) {
      await esperar()
      const itens = ler()
      const id = itens.reduce((max, i) => Math.max(max, i.id), 0) + 1
      const novo = { ...preencher(dados), id } as T
      gravar([...itens, novo])
      return structuredClone(novo)
    },
    async atualizar(id, dados) {
      await esperar()
      const itens = ler()
      const atualizado: T = { ...encontrar(itens, id), ...dados, id }
      gravar(itens.map((i) => (i.id === id ? atualizado : i)))
      return structuredClone(atualizado)
    },
    async excluir(id) {
      await esperar()
      const itens = ler()
      encontrar(itens, id)
      gravar(itens.filter((i) => i.id !== id))
    },
  }
}
