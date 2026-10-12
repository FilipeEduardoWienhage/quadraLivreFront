import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import './Campo.css'

function juntar(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}

interface CampoProps {
  rotulo: string
  /** controle do formulário: Entrada, Selecao, AreaTexto… */
  children: ReactNode
  erro?: string
  ajuda?: ReactNode
  obrigatorio?: boolean
}

/** Rótulo + controle + mensagem de ajuda/erro. */
export function Campo({ rotulo, children, erro, ajuda, obrigatorio }: CampoProps) {
  return (
    <label className={juntar('campo', erro && 'campo-com-erro')}>
      <span className="campo-rotulo">
        {rotulo}
        {obrigatorio && <span className="campo-obrigatorio"> *</span>}
      </span>
      {children}
      {erro ? <span className="campo-erro">{erro}</span> : ajuda && <span className="campo-ajuda">{ajuda}</span>}
    </label>
  )
}

export function Entrada({ className, ...resto }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={juntar('controle', className)} {...resto} />
}

export interface Opcao<V extends string | number = string> {
  valor: V
  rotulo: string
}

interface SelecaoProps extends SelectHTMLAttributes<HTMLSelectElement> {
  opcoes: Opcao<string | number>[]
  /** texto da opção vazia; omitir para não ter opção vazia */
  placeholder?: string
}

export function Selecao({ opcoes, placeholder, className, ...resto }: SelecaoProps) {
  return (
    <select className={juntar('controle', className)} {...resto}>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {opcoes.map((o) => (
        <option key={o.valor} value={o.valor}>
          {o.rotulo}
        </option>
      ))}
    </select>
  )
}

export function AreaTexto({ className, rows = 3, ...resto }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={juntar('controle', className)} rows={rows} {...resto} />
}

interface CaixaSelecaoProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  rotulo: string
}

export function CaixaSelecao({ rotulo, className, ...resto }: CaixaSelecaoProps) {
  return (
    <label className={juntar('caixa-selecao', className)}>
      <input type="checkbox" {...resto} />
      {rotulo}
    </label>
  )
}

/** Rótulo para um conjunto de controles (onde um <label> único não serve). */
export function GrupoCampos({ rotulo, ajuda, children }: { rotulo: string; ajuda?: string; children: ReactNode }) {
  return (
    <fieldset className="grupo-campos">
      <legend className="campo-rotulo">{rotulo}</legend>
      {ajuda && <p className="campo-ajuda grupo-campos-ajuda">{ajuda}</p>}
      {children}
    </fieldset>
  )
}

/** Coloca campos lado a lado. */
export function LinhaCampos({ children }: { children: ReactNode }) {
  return <div className="linha-campos">{children}</div>
}
