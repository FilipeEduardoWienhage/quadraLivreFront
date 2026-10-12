import type { ReactNode } from 'react'
import type { DiaSemana, HorarioSemanal } from '../types/models'
import { diasSemana } from '../utils/formatar'
import Botao from './Botao'
import { Entrada, Selecao } from './Campo'
import './EditorHorarios.css'

const opcoesDia = Object.entries(diasSemana).map(([valor, rotulo]) => ({ valor: Number(valor), rotulo }))

interface Props<T extends HorarioSemanal> {
  horarios: T[]
  onChange: (horarios: T[]) => void
  /** linha inserida quando a lista está vazia */
  novo: T
  /** campo a mais em cada linha (ex.: o valor de uma faixa de preço) */
  extra?: (horario: T, alterar: (mudanca: Partial<T>) => void) => ReactNode
  textoAdicionar?: string
}

/** Lista editável de horários semanais (dia + início + fim, e opcionalmente um campo extra). */
export default function EditorHorarios<T extends HorarioSemanal>({
  horarios,
  onChange,
  novo,
  extra,
  textoAdicionar = 'Adicionar horário',
}: Props<T>) {
  function alterar(indice: number, mudanca: Partial<T>) {
    onChange(horarios.map((h, i) => (i === indice ? { ...h, ...mudanca } : h)))
  }

  function adicionar() {
    // repete a última linha: o caso comum é a mesma faixa em outro dia
    const ultimo = horarios.at(-1)
    onChange([...horarios, { ...(ultimo ?? novo) }])
  }

  return (
    <div className="editor-horarios">
      {horarios.map((h, i) => (
        // linhas sem id próprio e sem estado interno: o índice basta como key
        <div className={`editor-horarios-linha${extra ? ' editor-horarios-com-extra' : ''}`} key={i}>
          <Selecao
            aria-label="Dia da semana"
            opcoes={opcoesDia}
            value={h.diaSemana}
            onChange={(e) => alterar(i, { diaSemana: Number(e.target.value) as DiaSemana } as Partial<T>)}
          />
          <Entrada
            type="time"
            aria-label="Início"
            value={h.horaInicio}
            onChange={(e) => alterar(i, { horaInicio: e.target.value } as Partial<T>)}
            required
          />
          <span className="editor-horarios-ate">até</span>
          <Entrada
            type="time"
            aria-label="Fim"
            value={h.horaFim}
            onChange={(e) => alterar(i, { horaFim: e.target.value } as Partial<T>)}
            required
          />
          {extra?.(h, (mudanca) => alterar(i, mudanca))}
          <Botao variante="fantasma" pequeno onClick={() => onChange(horarios.filter((_, j) => j !== i))}>
            Remover
          </Botao>
        </div>
      ))}
      <div>
        <Botao variante="secundario" pequeno onClick={adicionar}>
          {textoAdicionar}
        </Botao>
      </div>
    </div>
  )
}
