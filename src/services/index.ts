// Ponto único de acesso aos dados: trocar o mock pela API real acontece só aqui.
export type * from './api'

export {
  categoriasDespesaApi,
  configuracoesApi,
  espacosApi,
  formasPagamentoApi,
  modalidadesApi,
  pessoasApi,
  planosApi,
  servicosApi,
  turmasAlunosApi,
  turmasApi,
} from './mock/recursos'
export { agendamentosApi } from './mock/agenda'
export { contratosApi } from './mock/contratos'
export { transacoesApi } from './mock/financeiro'
