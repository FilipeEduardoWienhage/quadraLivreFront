// Horário de funcionamento de uma data: semana + feriados (ver configuracoes em docs/modelagem.md).
// Usado pela tela (limites da agenda) e pelo mock do servidor (validação ao agendar).
import type { Feriado, HorarioFuncionamento } from '../types/models'
import { diaDaSemana } from './data'

export type Funcionamento =
  | { aberto: true; abertura: string; fechamento: string; feriado?: string }
  | { aberto: false; feriado?: string }

/** Feriado da data: o de data específica vence o que repete todo ano. */
export function feriadoDoDia(feriados: Feriado[], data: string) {
  return (
    feriados.find((f) => !f.anual && f.data === data) ??
    feriados.find((f) => f.anual && f.data.slice(5) === data.slice(5))
  )
}

/** Como a academia funciona na data ('YYYY-MM-DD'). */
export function funcionamentoDoDia(
  semana: HorarioFuncionamento[],
  feriados: Feriado[],
  data: string,
): Funcionamento {
  const feriado = feriadoDoDia(feriados, data)
  if (feriado) {
    return feriado.aberto && feriado.abertura && feriado.fechamento
      ? { aberto: true, abertura: feriado.abertura, fechamento: feriado.fechamento, feriado: feriado.nome }
      : { aberto: false, feriado: feriado.nome }
  }
  const dia = semana.find((h) => h.diaSemana === diaDaSemana(data))
  return dia?.aberto ? { aberto: true, abertura: dia.abertura, fechamento: dia.fechamento } : { aberto: false }
}
