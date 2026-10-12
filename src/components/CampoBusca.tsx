import { Entrada } from './Campo'

interface Props {
  valor: string
  onChange: (valor: string) => void
  /** ex.: "Buscar por nome, e-mail ou telefone" — também vira o rótulo acessível */
  placeholder: string
}

/** Busca livre de uma lista, para usar dentro da BarraFiltros. */
export default function CampoBusca({ valor, onChange, placeholder }: Props) {
  return (
    <Entrada
      type="search"
      placeholder={placeholder}
      aria-label={placeholder}
      value={valor}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}
