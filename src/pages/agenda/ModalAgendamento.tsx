import { useState } from 'react'
import { AreaTexto, Botao, Campo, Entrada, LinhaCampos, ModalFormulario, Selecao } from '../../components'
import { FUNCIONAMENTO } from '../../config'
import type { DadosAgendamento } from '../../services'
import type { Contrato, Espaco, Id, Modalidade, Pessoa, Plano, TipoAgendamento } from '../../types/models'
import { diaDaSemana } from '../../utils/data'
import { formatarMoeda } from '../../utils/formatar'
import { minutos, paraHora } from '../../utils/horarios'
import { paraOpcao } from '../../utils/opcoes'
import { calcularValorLocacao, periodosDoDia } from '../../utils/precos'
import AlunosDaAula from './AlunosDaAula'

export interface InicialAgendamento {
  espacoId: Id
  data: string
  horaInicio: string
}

interface Props {
  inicial: InicialAgendamento
  espacos: Espaco[]
  pessoas: Pessoa[]
  modalidades: Modalidade[]
  contratos: Contrato[]
  planos: Plano[]
  onSalvar: (dados: DadosAgendamento) => Promise<void>
  onFechar: () => void
}

const opcoesTipo: { valor: Exclude<TipoAgendamento, 'AULA_TURMA'>; rotulo: string }[] = [
  { valor: 'LOCACAO', rotulo: 'Locação / reserva' },
  { valor: 'AULA', rotulo: 'Aula' },
]

const umaHoraDepois = (horaInicio: string) =>
  paraHora(Math.min(minutos(horaInicio) + 60, minutos(FUNCIONAMENTO.fechamento)))

/** Encontros de turma não passam por aqui: nascem dos horários da turma. */
export default function ModalAgendamento({
  inicial,
  espacos,
  pessoas,
  modalidades,
  contratos,
  planos,
  onSalvar,
  onFechar,
}: Props) {
  const espacoInicial = espacos.find((e) => e.id === inicial.espacoId)
  const [tipo, setTipo] = useState<'LOCACAO' | 'AULA'>(espacoInicial?.locacao === 'NAO' ? 'AULA' : 'LOCACAO')
  const [espacoId, setEspacoId] = useState(inicial.espacoId)
  const [data, setData] = useState(inicial.data)
  const [horaInicio, setHoraInicio] = useState(inicial.horaInicio)
  const [horaFim, setHoraFim] = useState(umaHoraDepois(inicial.horaInicio))
  const [observacao, setObservacao] = useState('')
  // locação
  const [pessoaId, setPessoaId] = useState('')
  /** null = usa o valor da tabela; número = valor negociado pelo gestor */
  const [valorNegociado, setValorNegociado] = useState<number | null>(null)
  // aula
  const [modalidadeId, setModalidadeId] = useState('')
  const [professorId, setProfessorId] = useState('')
  const [alunos, setAlunos] = useState<Id[]>([])

  const espaco = espacos.find((e) => e.id === espacoId)
  const planoPorId = new Map(planos.map((p) => [p.id, p]))
  const ativos = pessoas.filter((p) => p.ativo)

  /** Contratos ativos na data, por aluno. */
  const contratosNaData = (alunoId: Id) =>
    contratos.filter(
      (c) => c.alunoId === alunoId && c.status === 'ATIVO' && c.dataInicio <= data && (!c.dataFim || c.dataFim >= data),
    )

  /** Item do contrato que paga a aula: o da modalidade escolhida. */
  const itemDoAluno = (alunoId: Id) =>
    contratosNaData(alunoId)
      .flatMap((c) => c.itens)
      .find((i) => planoPorId.get(i.planoId)?.modalidadeId === Number(modalidadeId))

  // locação: espaços alugáveis; aula: qualquer espaço disponível
  const opcoesEspaco = espacos
    .filter((e) => e.status === 'ATIVO' && (tipo === 'AULA' || e.locacao !== 'NAO'))
    .map(paraOpcao)

  const porPeriodo = tipo === 'LOCACAO' && espaco?.locacao === 'POR_PERIODO'
  const periodos = espaco && porPeriodo ? periodosDoDia(espaco, diaDaSemana(data)) : []
  const preco = tipo === 'LOCACAO' && espaco ? calcularValorLocacao(espaco, diaDaSemana(data), horaInicio, horaFim) : null
  const valorTabela = preco && 'valor' in preco ? preco.valor : undefined
  const valor = valorNegociado ?? valorTabela

  const responsavelAluno = pessoaId !== '' && contratosNaData(Number(pessoaId)).length > 0

  function salvar() {
    const base = {
      espacoId,
      dataInicio: `${data}T${horaInicio}:00`,
      dataFim: `${data}T${horaFim}:00`,
      observacao: observacao.trim() || undefined,
    }
    if (tipo === 'LOCACAO') {
      if (valor === undefined) throw new Error(preco && 'erro' in preco ? preco.erro : 'Informe o valor.')
      return onSalvar({ ...base, tipo, pessoaId: Number(pessoaId), valor, participantes: [] })
    }
    if (alunos.length === 0) throw new Error('Inclua ao menos um aluno.')
    return onSalvar({
      ...base,
      tipo,
      modalidadeId: Number(modalidadeId),
      participantes: [
        { pessoaId: Number(professorId), papel: 'PROFESSOR' },
        ...alunos.map((alunoId) => ({ pessoaId: alunoId, papel: 'ALUNO' as const, contratoItemId: itemDoAluno(alunoId)?.id })),
      ],
    })
  }

  return (
    <ModalFormulario
      aberto
      titulo="Novo agendamento"
      textoSalvar="Agendar"
      mensagemSucesso={tipo === 'LOCACAO' ? 'Locação agendada e cobrança lançada.' : 'Aula agendada.'}
      largura="grande"
      onFechar={onFechar}
      onSalvar={salvar}
    >
      <LinhaCampos>
        <Campo rotulo="Tipo" obrigatorio>
          <Selecao opcoes={opcoesTipo} value={tipo} onChange={(e) => setTipo(e.target.value as 'LOCACAO' | 'AULA')} />
        </Campo>
        <Campo rotulo="Local" obrigatorio>
          <Selecao
            placeholder="Selecione…"
            opcoes={opcoesEspaco}
            value={espacoId || ''}
            onChange={(e) => setEspacoId(Number(e.target.value))}
            required
          />
        </Campo>
        <Campo rotulo="Data" obrigatorio>
          <Entrada type="date" value={data} onChange={(e) => setData(e.target.value)} required />
        </Campo>
      </LinhaCampos>

      {porPeriodo ? (
        <Campo rotulo="Período" ajuda={periodos.length ? undefined : 'Nenhum período reservável neste dia da semana.'} obrigatorio>
          <Selecao
            placeholder="Selecione…"
            opcoes={periodos.map((p) => ({
              valor: `${p.horaInicio}-${p.horaFim}`,
              rotulo: `${p.horaInicio}–${p.horaFim} — ${formatarMoeda(p.valor)}`,
            }))}
            value={periodos.some((p) => p.horaInicio === horaInicio && p.horaFim === horaFim) ? `${horaInicio}-${horaFim}` : ''}
            onChange={(e) => {
              const [inicio, fim] = e.target.value.split('-')
              setHoraInicio(inicio)
              setHoraFim(fim)
            }}
            required
          />
        </Campo>
      ) : (
        <LinhaCampos>
          <Campo rotulo="Início" obrigatorio>
            <Entrada
              type="time"
              min={FUNCIONAMENTO.abertura}
              max={FUNCIONAMENTO.fechamento}
              value={horaInicio}
              onChange={(e) => {
                setHoraInicio(e.target.value)
                if (e.target.value >= horaFim) setHoraFim(umaHoraDepois(e.target.value))
              }}
              required
            />
          </Campo>
          <Campo rotulo="Fim" obrigatorio>
            <Entrada
              type="time"
              min={horaInicio}
              max={FUNCIONAMENTO.fechamento}
              value={horaFim}
              onChange={(e) => setHoraFim(e.target.value)}
              required
            />
          </Campo>
        </LinhaCampos>
      )}

      {tipo === 'LOCACAO' ? (
        <LinhaCampos>
          <Campo
            rotulo="Responsável"
            ajuda={responsavelAluno ? 'Aluno com contrato ativo: desconto a seu critério.' : undefined}
            obrigatorio
          >
            <Selecao
              placeholder="Selecione…"
              opcoes={ativos.map(paraOpcao)}
              value={pessoaId}
              onChange={(e) => setPessoaId(e.target.value)}
              required
            />
          </Campo>
          <Campo
            rotulo="Valor (R$)"
            ajuda={
              valorTabela === undefined ? (
                (preco && 'erro' in preco && preco.erro) || undefined
              ) : valorNegociado !== null && valorNegociado !== valorTabela ? (
                <>
                  Tabela: {formatarMoeda(valorTabela)}.{' '}
                  <Botao variante="fantasma" pequeno onClick={() => setValorNegociado(null)}>
                    Usar valor da tabela
                  </Botao>
                </>
              ) : (
                'Valor da tabela de preços.'
              )
            }
            obrigatorio
          >
            <Entrada
              type="number"
              min={0}
              step={0.01}
              value={valor ?? ''}
              onChange={(e) => setValorNegociado(e.target.value === '' ? null : Number(e.target.value))}
              required
            />
          </Campo>
        </LinhaCampos>
      ) : (
        <>
          <LinhaCampos>
            <Campo rotulo="Modalidade" obrigatorio>
              <Selecao
                placeholder="Selecione…"
                opcoes={modalidades.filter((m) => m.ativo).map(paraOpcao)}
                value={modalidadeId}
                onChange={(e) => setModalidadeId(e.target.value)}
                required
              />
            </Campo>
            <Campo rotulo="Professor" obrigatorio>
              <Selecao
                placeholder="Selecione…"
                opcoes={ativos.filter((p) => p.professor).map(paraOpcao)}
                value={professorId}
                onChange={(e) => setProfessorId(e.target.value)}
                required
              />
            </Campo>
          </LinhaCampos>
          <AlunosDaAula
            alunos={alunos}
            onChange={setAlunos}
            pessoas={ativos}
            professorId={professorId ? Number(professorId) : null}
            itemDoAluno={itemDoAluno}
            planoPorId={planoPorId}
            data={data}
          />
        </>
      )}

      <Campo rotulo="Observação">
        <AreaTexto rows={2} value={observacao} onChange={(e) => setObservacao(e.target.value)} />
      </Campo>
    </ModalFormulario>
  )
}
