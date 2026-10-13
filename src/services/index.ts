// Ponto único de acesso aos dados: trocar o mock pela API real acontece só aqui.
import { agendamentosApi as agendamentos } from './mock/agenda'
import { contratosApi as contratos } from './mock/contratos'
import { transacoesApi as transacoes } from './mock/financeiro'
import { comLatencia } from './mock/latencia'
import { painelApi as painel } from './mock/painel'
import * as recursos from './mock/recursos'

export type * from './api'

export const categoriasDespesaApi = comLatencia(recursos.categoriasDespesaApi)
export const configuracoesApi = comLatencia(recursos.configuracoesApi)
export const espacosApi = comLatencia(recursos.espacosApi)
export const feriadosApi = comLatencia(recursos.feriadosApi)
export const formasPagamentoApi = comLatencia(recursos.formasPagamentoApi)
export const modalidadesApi = comLatencia(recursos.modalidadesApi)
export const pessoasApi = comLatencia(recursos.pessoasApi)
export const planosApi = comLatencia(recursos.planosApi)
export const servicosApi = comLatencia(recursos.servicosApi)
export const turmasAlunosApi = comLatencia(recursos.turmasAlunosApi)
export const turmasApi = comLatencia(recursos.turmasApi)
export const agendamentosApi = comLatencia(agendamentos)
export const contratosApi = comLatencia(contratos)
export const transacoesApi = comLatencia(transacoes)
export const painelApi = comLatencia(painel)
