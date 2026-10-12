import { Botao } from '../../components'
import type { Modalidade } from '../../types/models'
import { estiloCor } from './descricao'

interface Props {
  corLocacao: string
  /** só as ativas: são as que aparecem na agenda */
  modalidades: Modalidade[]
  onEditar: () => void
}

/** Cores da agenda: locação e cada modalidade. */
export default function LegendaCores({ corLocacao, modalidades, onEditar }: Props) {
  return (
    <ul className="agenda-legenda" aria-label="Legenda de cores">
      <li>
        <span className="agenda-legenda-cor agenda-bloco" style={estiloCor(corLocacao)} />
        Locação
      </li>
      {modalidades.map((m) => (
        <li key={m.id}>
          <span className="agenda-legenda-cor agenda-bloco" style={estiloCor(m.cor)} />
          {m.nome}
        </li>
      ))}
      <li>
        <Botao variante="fantasma" pequeno onClick={onEditar}>
          Editar cores
        </Botao>
      </li>
    </ul>
  )
}
