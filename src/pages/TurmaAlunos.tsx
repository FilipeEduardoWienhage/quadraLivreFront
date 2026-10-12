import { useMemo, useState } from 'react'
import { Alerta, Botao, Modal, Selecao, Tabela, type Coluna } from '../components'
import { mensagemErro } from '../hooks/useRecurso'
import { useToast } from '../hooks/useToast'
import type { Dados } from '../services'
import type { Id, Pessoa, Turma, TurmaAluno } from '../types/models'
import { hojeIso } from '../utils/data'
import { formatarData } from '../utils/formatar'
import { omitir } from '../utils/objeto'
import { paraOpcao } from '../utils/opcoes'
import './TurmaAlunos.css'

interface Props {
  turma: Turma
  /** matrículas de todas as turmas, inclusive encerradas */
  matriculas: TurmaAluno[]
  pessoas: Pessoa[]
  onSalvarMatricula: (dados: Dados<TurmaAluno>, id?: Id) => Promise<unknown>
  onFechar: () => void
}

/**
 * Entrada e saída de alunos. Sair não apaga a matrícula: preenche dataSaida,
 * preservando quem já participou da turma (ver turmas_alunos em docs/modelagem.md).
 */
export default function TurmaAlunos({ turma, matriculas, pessoas, onSalvarMatricula, onFechar }: Props) {
  const toast = useToast()
  const [alunoId, setAlunoId] = useState('')
  const [ocupado, setOcupado] = useState(false)

  const nomes = useMemo(() => new Map(pessoas.map((p) => [p.id, p.nome])), [pessoas])

  const ativas = useMemo(
    () => matriculas.filter((m) => m.turmaId === turma.id && !m.dataSaida),
    [matriculas, turma.id],
  )

  const opcoesAluno = useMemo(() => {
    const naTurma = new Set(ativas.map((m) => m.alunoId))
    return pessoas
      .filter((p) => p.ativo && p.aluno && !naTurma.has(p.id))
      .map(paraOpcao)
  }, [pessoas, ativas])

  const lotada = ativas.length >= turma.capacidade

  async function executar(acao: () => Promise<unknown>, sucesso: string) {
    setOcupado(true)
    try {
      await acao()
      toast.sucesso(sucesso)
    } catch (e) {
      toast.erro(mensagemErro(e))
    } finally {
      setOcupado(false)
    }
  }

  function adicionar() {
    const id = Number(alunoId)
    void executar(async () => {
      await onSalvarMatricula({ turmaId: turma.id, alunoId: id, dataEntrada: hojeIso() })
      setAlunoId('')
    }, `${nomes.get(id)} entrou na turma.`)
  }

  function remover(m: TurmaAluno) {
    void executar(
      () => onSalvarMatricula({ ...omitir(m, 'id'), dataSaida: hojeIso() }, m.id),
      `${nomes.get(m.alunoId)} saiu da turma.`,
    )
  }

  const colunas: Coluna<TurmaAluno>[] = [
    { titulo: 'Aluno', valor: (m) => nomes.get(m.alunoId) ?? '—' },
    { titulo: 'Na turma desde', valor: (m) => formatarData(m.dataEntrada), largura: '150px' },
  ]

  return (
    <Modal
      aberto
      titulo={`Alunos — ${turma.nome}`}
      onFechar={onFechar}
      largura="grande"
      rodape={
        <Botao variante="secundario" onClick={onFechar}>
          Fechar
        </Botao>
      }
    >
      <p className="turma-alunos-vagas">
        {ativas.length} de {turma.capacidade} vagas ocupadas.
      </p>

      {lotada ? (
        <Alerta tipo="info">Turma lotada. Aumente a capacidade ou remova um aluno para adicionar outro.</Alerta>
      ) : (
        <div className="turma-alunos-adicionar">
          <Selecao
            aria-label="Aluno para adicionar"
            placeholder={opcoesAluno.length ? 'Selecione um aluno…' : 'Nenhum aluno disponível'}
            opcoes={opcoesAluno}
            value={alunoId}
            onChange={(e) => setAlunoId(e.target.value)}
            disabled={ocupado || opcoesAluno.length === 0}
          />
          <Botao onClick={adicionar} disabled={!alunoId} carregando={ocupado}>
            Adicionar
          </Botao>
        </div>
      )}

      <Tabela
        colunas={colunas}
        itens={ativas}
        vazio="Nenhum aluno na turma."
        acoes={(m) => (
          <Botao variante="fantasma" pequeno onClick={() => remover(m)} disabled={ocupado}>
            Remover
          </Botao>
        )}
      />
    </Modal>
  )
}
