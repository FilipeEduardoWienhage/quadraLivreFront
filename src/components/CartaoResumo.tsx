import './CartaoResumo.css'

interface Props {
  rotulo: string
  valor: string
  /** linha menor abaixo do valor, ex.: "3 cobranças" */
  detalhe?: string
  tom?: 'neutro' | 'positivo' | 'alerta'
}

/** Indicador numérico (ex.: total a receber). */
export default function CartaoResumo({ rotulo, valor, detalhe, tom = 'neutro' }: Props) {
  return (
    <div className={`cartao-resumo cartao-resumo-${tom}`}>
      <span className="cartao-resumo-rotulo">{rotulo}</span>
      <strong className="cartao-resumo-valor">{valor}</strong>
      {detalhe && <span className="cartao-resumo-detalhe">{detalhe}</span>}
    </div>
  )
}
