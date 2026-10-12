import type { CSSProperties } from 'react'
import type { Agendamento, Id, TipoAgendamento } from '../../types/models'
import { pluralizar } from '../../utils/formatar'

/** Cor de um agendamento na agenda: locação pela configuração, aulas e turmas pela modalidade. */
export type CorDe = (agendamento: Agendamento) => string

/** Passa a cor para o CSS, que deriva o fundo claro dela (ver .agenda-bloco). */
export const estiloCor = (cor: string) => ({ '--cor': cor }) as CSSProperties

export const tiposAgendamento: Record<TipoAgendamento, string> = {
  LOCACAO: 'Locação',
  AULA: 'Aula',
  AULA_TURMA: 'Turma',
}

/** Nomes já resolvidos pela página, para descrever um agendamento em uma linha. */
export interface Nomes {
  pessoa: Map<Id, string>
  modalidade: Map<Id, string>
  turma: Map<Id, string>
  espaco: Map<Id, string>
}

export const hora = (dataHora: string) => dataHora.slice(11, 16)

const contar = (n: number) => pluralizar(n, 'aluno', 'alunos')

/** Título e subtítulo usados no card do espaço e na lista do dia. */
export function descrever(a: Agendamento, nomes: Nomes) {
  const professor = a.participantes.find((p) => p.papel === 'PROFESSOR')
  const alunos = a.participantes.filter((p) => p.papel === 'ALUNO')
  const nomeProfessor = professor ? (nomes.pessoa.get(professor.pessoaId) ?? '') : ''

  switch (a.tipo) {
    case 'LOCACAO':
      return { titulo: 'Locação', subtitulo: nomes.pessoa.get(a.pessoaId ?? 0) ?? '—' }
    case 'AULA':
      return {
        titulo: nomes.modalidade.get(a.modalidadeId ?? 0) ?? 'Aula',
        subtitulo: `${nomeProfessor} · ${alunos.length === 1 ? nomes.pessoa.get(alunos[0].pessoaId) : contar(alunos.length)}`,
      }
    case 'AULA_TURMA':
      return { titulo: nomes.turma.get(a.turmaId ?? 0) ?? 'Turma', subtitulo: `${nomeProfessor} · ${contar(alunos.length)}` }
  }
}
