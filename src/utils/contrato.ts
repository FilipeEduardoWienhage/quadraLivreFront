import type { Contrato } from '../types/models'
import { arredondarMoeda } from './formatar'

/** Soma dos itens: o valor do mês (MENSAL) ou do pacote. */
export const totalContrato = (c: Pick<Contrato, 'itens'>) =>
  arredondarMoeda(c.itens.reduce((soma, item) => soma + item.valor, 0))

/**
 * Dias de uma competência ('YYYY-MM') cobrados de um contrato mensal: começa no início do contrato
 * se o 1º mês é proporcional, e termina no fim dele se o último mês é proporcional.
 */
export function diasCobrados(
  contrato: Pick<Contrato, 'dataInicio' | 'dataFim' | 'proporcional' | 'cobrancaFinal'>,
  competencia: string,
) {
  const [ano, mes] = competencia.split('-').map(Number)
  const diasNoMes = new Date(ano, mes, 0).getDate()
  const dia = (data: string) => Number(data.slice(8, 10))
  const primeiro = contrato.proporcional && contrato.dataInicio.startsWith(competencia) ? dia(contrato.dataInicio) : 1
  const ultimo =
    contrato.cobrancaFinal === 'PROPORCIONAL' && contrato.dataFim?.startsWith(competencia)
      ? dia(contrato.dataFim)
      : diasNoMes
  return { dias: ultimo - primeiro + 1, diasNoMes }
}

/** Divide um total entre partes proporcionalmente aos pesos; a última absorve o arredondamento. */
export function ratear(total: number, pesos: number[]) {
  const soma = pesos.reduce((s, p) => s + p, 0)
  const partes = pesos.map((p) => arredondarMoeda((total * p) / soma))
  partes[partes.length - 1] = arredondarMoeda(total - partes.slice(0, -1).reduce((s, p) => s + p, 0))
  return partes
}
