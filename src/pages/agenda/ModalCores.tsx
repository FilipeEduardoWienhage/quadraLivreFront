import { useState } from 'react'
import { Campo, Entrada, ModalFormulario } from '../../components'
import type { Id, Modalidade } from '../../types/models'

interface Props {
  corLocacao: string
  modalidades: Modalidade[]
  /** recebe só o que mudou */
  onSalvar: (corLocacao: string, coresModalidades: Map<Id, string>) => Promise<void>
  onFechar: () => void
}

/** Edição das cores da legenda: locação (configuração) e cada modalidade. */
export default function ModalCores({ corLocacao, modalidades, onSalvar, onFechar }: Props) {
  const [locacao, setLocacao] = useState(corLocacao)
  const [cores, setCores] = useState(() => new Map(modalidades.map((m) => [m.id, m.cor])))

  function salvar() {
    const alteradas = new Map([...cores].filter(([id, cor]) => modalidades.find((m) => m.id === id)?.cor !== cor))
    return onSalvar(locacao, alteradas)
  }

  return (
    <ModalFormulario
      aberto
      titulo="Cores da agenda"
      mensagemSucesso="Cores atualizadas."
      largura="pequena"
      onFechar={onFechar}
      onSalvar={salvar}
    >
      <Campo rotulo="Locação / reserva">
        <Entrada type="color" className="controle-cor" value={locacao} onChange={(e) => setLocacao(e.target.value)} />
      </Campo>
      {modalidades.map((m) => (
        <Campo key={m.id} rotulo={m.nome} ajuda="Aulas e turmas da modalidade.">
          <Entrada
            type="color"
            className="controle-cor"
            value={cores.get(m.id)}
            onChange={(e) => setCores(new Map(cores).set(m.id, e.target.value))}
          />
        </Campo>
      ))}
    </ModalFormulario>
  )
}
