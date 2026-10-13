import { useState, type FormEvent } from 'react'
import { Botao, CaixaSelecao, Entrada } from '../../components'
import { mensagemErro } from '../../hooks/useRecurso'
import { useToast } from '../../hooks/useToast'
import type { HorarioFuncionamento } from '../../types/models'
import { diasSemana } from '../../utils/formatar'

/** Segunda primeiro: é como a academia pensa a semana. */
const ORDEM = [1, 2, 3, 4, 5, 6, 0]

interface Props {
  funcionamento: HorarioFuncionamento[]
  onSalvar: (funcionamento: HorarioFuncionamento[]) => Promise<void>
}

/** Horário de funcionamento de cada dia da semana (inclui o fim de semana). */
export default function HorarioSemana({ funcionamento, onSalvar }: Props) {
  const toast = useToast()
  const [dias, setDias] = useState(() =>
    ORDEM.map((d) => funcionamento.find((h) => h.diaSemana === d)).filter((h) => h !== undefined),
  )
  const [salvando, setSalvando] = useState(false)

  function alterar(indice: number, mudanca: Partial<HorarioFuncionamento>) {
    setDias(dias.map((d, i) => (i === indice ? { ...d, ...mudanca } : d)))
  }

  async function salvar(e: FormEvent) {
    e.preventDefault()
    const invalido = dias.find((d) => d.aberto && d.fechamento <= d.abertura)
    if (invalido) {
      toast.erro(`${diasSemana[invalido.diaSemana]}: o fechamento deve ser depois da abertura.`)
      return
    }
    setSalvando(true)
    try {
      await onSalvar(dias)
      toast.sucesso('Horário de funcionamento salvo.')
    } catch (erro) {
      toast.erro(mensagemErro(erro))
    } finally {
      setSalvando(false)
    }
  }

  return (
    <form className="horario-semana" onSubmit={salvar}>
      {dias.map((d, i) => (
        <div className={`horario-semana-dia${d.aberto ? '' : ' fechado'}`} key={d.diaSemana}>
          <strong>{diasSemana[d.diaSemana]}</strong>
          <CaixaSelecao
            rotulo="Aberto"
            checked={d.aberto}
            onChange={(e) => alterar(i, { aberto: e.target.checked })}
          />
          <Entrada
            type="time"
            aria-label={`Abertura de ${diasSemana[d.diaSemana]}`}
            value={d.abertura}
            onChange={(e) => alterar(i, { abertura: e.target.value })}
            disabled={!d.aberto}
            required={d.aberto}
          />
          <span className="horario-semana-ate">às</span>
          <Entrada
            type="time"
            aria-label={`Fechamento de ${diasSemana[d.diaSemana]}`}
            value={d.fechamento}
            onChange={(e) => alterar(i, { fechamento: e.target.value })}
            disabled={!d.aberto}
            required={d.aberto}
          />
        </div>
      ))}
      <div className="horario-semana-acoes">
        <Botao type="submit" carregando={salvando}>
          Salvar horário
        </Botao>
      </div>
    </form>
  )
}
