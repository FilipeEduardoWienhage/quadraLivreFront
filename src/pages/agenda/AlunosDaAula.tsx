import { useEffect, useState } from 'react'
import { Botao, GrupoCampos, Selecao } from '../../components'
import { agendamentosApi, type Cota } from '../../services'
import type { ContratoItem, Id, Pessoa, Plano } from '../../types/models'
import { paraOpcao } from '../../utils/opcoes'

interface Props {
  alunos: Id[]
  onChange: (alunos: Id[]) => void
  /** pessoas ativas; a lista oferece só as que são alunas */
  pessoas: Pessoa[]
  /** o professor da aula não pode ser incluído como aluno */
  professorId: Id | null
  /** item do contrato que paga a aula do aluno, na modalidade escolhida */
  itemDoAluno: (alunoId: Id) => ContratoItem | undefined
  planoPorId: Map<Id, Plano>
  /** 'YYYY-MM-DD': a cota mensal é contada na semana desta data */
  data: string
  /** na edição: participantes já salvos nesta aula (a cota deles já inclui esta aula) */
  jaNaAula?: { pessoaId: Id; contratoItemId?: Id }[]
}

/** Alunos de uma aula, cada um com o contrato que paga e o uso da cota. */
export default function AlunosDaAula({
  alunos,
  onChange,
  pessoas,
  professorId,
  itemDoAluno,
  planoPorId,
  data,
  jaNaAula = [],
}: Props) {
  const nome = new Map(pessoas.map((p) => [p.id, p.nome]))
  const disponiveis = pessoas.filter((p) => p.aluno && !alunos.includes(p.id) && p.id !== professorId)

  return (
    <GrupoCampos rotulo="Alunos" ajuda="A aula desconta da cota do contrato do aluno na modalidade escolhida.">
      <ul className="agenda-alunos">
        {alunos.map((alunoId) => {
          const item = itemDoAluno(alunoId)
          return (
            <LinhaAluno
              // trocar item ou data refaz a consulta da cota
              key={`${alunoId}-${item?.id}-${data}`}
              nome={nome.get(alunoId) ?? ''}
              item={item}
              plano={item && planoPorId.get(item.planoId)}
              data={data}
              jaContada={jaNaAula.some((p) => p.pessoaId === alunoId && p.contratoItemId === item?.id)}
              onRemover={() => onChange(alunos.filter((id) => id !== alunoId))}
            />
          )
        })}
      </ul>
      <Selecao
        aria-label="Incluir aluno"
        placeholder="Incluir aluno…"
        opcoes={disponiveis.map(paraOpcao)}
        value=""
        onChange={(e) => e.target.value && onChange([...alunos, Number(e.target.value)])}
      />
    </GrupoCampos>
  )
}

interface LinhaAlunoProps {
  nome: string
  item?: ContratoItem
  plano?: Plano
  data: string
  /** esta aula já está no uso da cota (edição): esgota só se passar do limite */
  jaContada: boolean
  onRemover: () => void
}

/** Aluno da aula com o contrato que paga e o uso da cota. */
function LinhaAluno({ nome, item, plano, data, jaContada, onRemover }: LinhaAlunoProps) {
  const [cota, setCota] = useState<Cota | null>(null)
  const itemId = item?.id

  useEffect(() => {
    if (!itemId) return
    let ignorar = false
    agendamentosApi
      .consultarCota(itemId, data)
      .then((c) => !ignorar && setCota(c))
      .catch(() => {
        // sem a cota a aula ainda pode ser marcada: só deixa de mostrar o uso
      })
    return () => {
      ignorar = true
    }
  }, [itemId, data])

  // aula nova precisa de vaga (usadas < limite); aula já contada só estoura se passar do limite
  const estourou = cota !== null && (jaContada ? cota.usadas > cota.limite : cota.usadas >= cota.limite)
  const usoCota =
    cota && `${cota.usadas}/${cota.limite} ${cota.periodo === 'SEMANA' ? 'nesta semana' : 'usadas do pacote'}`

  return (
    <li>
      <span>
        {nome}
        <small className={estourou ? 'agenda-cota-estourada' : undefined}>
          {item
            ? `${plano?.nome ?? 'Contrato'} · ${usoCota ?? 'consultando cota…'}${estourou ? ' — cota esgotada' : ''}`
            : 'Sem contrato nesta modalidade: cobre como aula avulsa no Financeiro.'}
        </small>
      </span>
      <Botao variante="fantasma" pequeno onClick={onRemover}>
        Remover
      </Botao>
    </li>
  )
}
