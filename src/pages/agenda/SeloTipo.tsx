import type { TipoAgendamento } from '../../types/models'

/** Locação não leva selo: o título do bloco já diz "Locação". */
const selos: Partial<Record<TipoAgendamento, string>> = {
  AULA: 'Aula',
  AULA_TURMA: 'Turma',
}

/** Selo do tipo, na cor do bloco (--cor): turma preenchido, aula contornado. */
export default function SeloTipo({ tipo }: { tipo: TipoAgendamento }) {
  const texto = selos[tipo]
  return texto ? <span className={`agenda-selo agenda-selo-${tipo.toLowerCase()}`}>{texto}</span> : null
}
