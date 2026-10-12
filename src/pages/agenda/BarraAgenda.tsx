import type { ReactNode } from 'react'
import { Botao, Entrada, Selecao } from '../../components'
import type { Espaco, Modalidade } from '../../types/models'
import { somarDias } from '../../utils/data'
import { paraOpcao } from '../../utils/opcoes'
import { LOCACOES, QUADRAS } from './filtros'

interface Props {
  data: string
  hoje: string
  onIrPara: (data: string) => void
  /** '' = todas; LOCACOES; ou id de modalidade */
  atividade: string
  onAtividade: (valor: string) => void
  /** '' = todos; QUADRAS; ou id de espaço */
  espaco: string
  onEspaco: (valor: string) => void
  modalidades: Modalidade[]
  espacos: Espaco[]
  /** à direita da barra (a legenda) */
  children?: ReactNode
}

/** Navegação entre dias e filtros da agenda. */
export default function BarraAgenda({
  data,
  hoje,
  onIrPara,
  atividade,
  onAtividade,
  espaco,
  onEspaco,
  modalidades,
  espacos,
  children,
}: Props) {
  return (
    <div className="agenda-barra">
      <Botao variante="secundario" pequeno aria-label="Dia anterior" onClick={() => onIrPara(somarDias(data, -1))}>
        ◀
      </Botao>
      <Botao variante="secundario" pequeno onClick={() => onIrPara(hoje)} disabled={data === hoje}>
        Hoje
      </Botao>
      <Botao variante="secundario" pequeno aria-label="Próximo dia" onClick={() => onIrPara(somarDias(data, 1))}>
        ▶
      </Botao>
      <Entrada type="date" aria-label="Data" value={data} onChange={(e) => e.target.value && onIrPara(e.target.value)} />
      <Selecao
        aria-label="Filtrar por atividade"
        placeholder="Todas as atividades"
        opcoes={[{ valor: LOCACOES, rotulo: 'Locações e reservas' }, ...modalidades.map(paraOpcao)]}
        value={atividade}
        onChange={(e) => onAtividade(e.target.value)}
      />
      <Selecao
        aria-label="Filtrar por espaço"
        placeholder="Todos os espaços"
        opcoes={[{ valor: QUADRAS, rotulo: 'Todas as quadras' }, ...espacos.map(paraOpcao)]}
        value={espaco}
        onChange={(e) => onEspaco(e.target.value)}
      />
      {children}
    </div>
  )
}
