import Etiqueta from './Etiqueta'

interface Props {
  ativo: boolean
  /** concorda com o substantivo: "Ativa" para pessoa, turma, modalidade… */
  feminino?: boolean
}

/** Situação de um cadastro que é inativado em vez de excluído. */
export default function EtiquetaSituacao({ ativo, feminino = false }: Props) {
  const fim = feminino ? 'a' : 'o'
  return ativo ? <Etiqueta cor="verde">{`Ativ${fim}`}</Etiqueta> : <Etiqueta>{`Inativ${fim}`}</Etiqueta>
}
