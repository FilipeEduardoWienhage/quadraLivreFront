import type { ButtonHTMLAttributes } from 'react'
import './Botao.css'

type Variante = 'primario' | 'secundario' | 'perigo' | 'fantasma'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante
  pequeno?: boolean
  /** desabilita o botão e indica que a ação está em andamento */
  carregando?: boolean
}

export default function Botao({
  variante = 'primario',
  pequeno = false,
  carregando = false,
  type = 'button',
  disabled,
  className,
  children,
  ...resto
}: Props) {
  const classes = ['botao', `botao-${variante}`, pequeno && 'botao-pequeno', className]
    .filter(Boolean)
    .join(' ')

  return (
    <button type={type} className={classes} disabled={disabled || carregando} {...resto}>
      {carregando ? 'Aguarde…' : children}
    </button>
  )
}
