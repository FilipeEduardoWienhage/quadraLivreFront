// Recursos mock sem regra de negócio além do CRUD.
import type {
  Agendamento,
  CategoriaDespesa,
  Configuracoes,
  Contrato,
  Espaco,
  FormaPagamento,
  Id,
  Modalidade,
  Pessoa,
  Plano,
  Servico,
  Transacao,
  Turma,
  TurmaAluno,
} from '../../types/models'
import { omitir } from '../../utils/objeto'
import type { ConfiguracoesApi, DadosPessoa } from '../api'
import { criarRecursoMock } from './criarRecursoMock'
import * as dados from './dados'

export const pessoasApi = criarRecursoMock<Pessoa, DadosPessoa>('pessoas', dados.pessoas, (p) => ({
  ...p,
  dataCadastro: new Date().toISOString().slice(0, 19),
}))
export const espacosApi = criarRecursoMock<Espaco>('espacos', dados.espacos)
export const modalidadesApi = criarRecursoMock<Modalidade>('modalidades', dados.modalidades)
export const servicosApi = criarRecursoMock<Servico>('servicos', dados.servicos)
export const formasPagamentoApi = criarRecursoMock<FormaPagamento>('formasPagamento', dados.formasPagamento)
export const categoriasDespesaApi = criarRecursoMock<CategoriaDespesa>('categoriasDespesa', dados.categoriasDespesa)
export const planosApi = criarRecursoMock<Plano>('planos', dados.planos)
export const turmasApi = criarRecursoMock<Turma>('turmas', dados.turmas)
export const turmasAlunosApi = criarRecursoMock<TurmaAluno>('turmasAlunos', dados.turmasAlunos)

// base sem regras: contratos.ts, financeiro.ts e agenda.ts montam as APIs públicas em cima delas
export const contratosBase = criarRecursoMock<Contrato>('contratos', dados.contratos)
export const transacoesBase = criarRecursoMock<Transacao>('transacoes', dados.transacoes)
export const agendamentosBase = criarRecursoMock<Agendamento>('agendamentos', dados.agendamentos)

// registro único guardado como lista de um item, com id fixo
const configuracoesBase = criarRecursoMock<Configuracoes & { id: Id }>('configuracoes', [{ id: 1, ...dados.configuracoes }])

export const configuracoesApi: ConfiguracoesApi = {
  async buscar() {
    return omitir(await configuracoesBase.buscar(1), 'id')
  },
  async salvar(configuracoes) {
    return omitir(await configuracoesBase.atualizar(1, configuracoes), 'id')
  },
}
