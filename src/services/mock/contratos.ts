// Simula as regras do servidor para contratos (ver contratos em docs/modelagem.md).
import type { ContratosApi, DadosContratoItem } from '../api'
import type { Contrato } from '../../types/models'
import { hojeIso } from '../../utils/data'
import { omitir } from '../../utils/objeto'
import { criarTransacao } from './financeiro'
import { numerarNovos } from './numerar'
import { contratosBase, planosApi } from './recursos'

async function numerarItens(itens: DadosContratoItem[]) {
  const todos = await contratosBase.listar()
  return numerarNovos(itens, todos.flatMap((c) => c.itens.map((i) => i.id)))
}

/** Venda de pacote: nasce a cobrança, um item por plano, vencendo no início do contrato. */
async function cobrarPacote(contrato: Contrato) {
  const planos = await planosApi.listar()
  const nomePlano = new Map(planos.map((p) => [p.id, p.nome]))
  await criarTransacao({
    tipo: 'RECEITA',
    pessoaId: contrato.alunoId,
    dataVencimento: contrato.dataInicio,
    movimentos: contrato.itens.map((item) => ({
      contratoItemId: item.id,
      descricao: nomePlano.get(item.planoId) ?? 'Pacote',
      quantidade: 1,
      valorUnitario: item.valor,
    })),
  })
}

export const contratosApi: ContratosApi = {
  listar: contratosBase.listar,
  buscar: contratosBase.buscar,
  excluir: contratosBase.excluir,
  async criar(dados) {
    const contrato = await contratosBase.criar({ ...dados, itens: await numerarItens(dados.itens) })
    if (contrato.tipo === 'PACOTE') await cobrarPacote(contrato)
    return contrato
  },
  async atualizar(id, dados) {
    return contratosBase.atualizar(id, { ...dados, itens: await numerarItens(dados.itens) })
  },
  async finalizar(id, status) {
    const contrato = await contratosBase.buscar(id)
    if (contrato.status !== 'ATIVO') throw new Error('Só contratos ativos podem ser encerrados ou cancelados.')
    const hoje = hojeIso()
    const dataFim = contrato.dataFim && contrato.dataFim < hoje ? contrato.dataFim : hoje
    return contratosBase.atualizar(id, { ...omitir(contrato, 'id'), status, dataFim })
  },
}
