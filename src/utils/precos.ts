// Cálculo do valor de locação pela tabela de preços do espaço (ver precos_espacos em docs/modelagem.md).
// Usado pela tela (sugestão) e pelo mock do servidor (validação): no backend real, a regra vive lá.
import type { DiaSemana, Espaco, FaixaPreco } from '../types/models'
import { arredondarMoeda } from './formatar'
import { minutos } from './horarios'

type ResultadoPreco = { valor: number } | { erro: string }

/** Períodos reserváveis do dia, em ordem (espaços POR_PERIODO). */
export function periodosDoDia(espaco: Espaco, diaSemana: DiaSemana): FaixaPreco[] {
  return espaco.precos
    .filter((p) => p.diaSemana === diaSemana)
    .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio))
}

/**
 * POR_HORA: soma cada parte do horário pelo valor da sua faixa (17h–19h = 1h a R$ 80 + 1h a R$ 120).
 * POR_PERIODO: o horário precisa ser exatamente um dos períodos do dia.
 */
export function calcularValorLocacao(
  espaco: Espaco,
  diaSemana: DiaSemana,
  horaInicio: string,
  horaFim: string,
): ResultadoPreco {
  if (espaco.locacao === 'NAO') return { erro: `${espaco.nome} não é alugável.` }

  const faixas = periodosDoDia(espaco, diaSemana)

  if (espaco.locacao === 'POR_PERIODO') {
    const periodo = faixas.find((p) => p.horaInicio === horaInicio && p.horaFim === horaFim)
    return periodo ? { valor: periodo.valor } : { erro: 'Escolha um dos períodos disponíveis no dia.' }
  }

  const [inicio, fim] = [minutos(horaInicio), minutos(horaFim)]
  let coberto = 0
  let valor = 0
  for (const faixa of faixas) {
    const sobreposicao = Math.min(fim, minutos(faixa.horaFim)) - Math.max(inicio, minutos(faixa.horaInicio))
    if (sobreposicao > 0) {
      coberto += sobreposicao
      valor += (sobreposicao * faixa.valor) / 60
    }
  }
  if (coberto < fim - inicio) return { erro: 'Parte do horário está fora da tabela de preços do espaço.' }
  return { valor: arredondarMoeda(valor) }
}
