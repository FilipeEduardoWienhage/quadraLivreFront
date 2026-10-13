import { useState } from 'react'
import { Alerta, AreaTexto, Botao, Campo, Entrada, LinhaCampos, ModalFormulario, Selecao } from '../../components'
import type { DadosAgendamento } from '../../services'
import type { Agendamento, Contrato, Espaco, Id, Modalidade, Pessoa, Plano, TipoAgendamento } from '../../types/models'
import { diaDaSemana } from '../../utils/data'
import { formatarMoeda } from '../../utils/formatar'
import type { Funcionamento } from '../../utils/funcionamento'
import { minutos, paraHora } from '../../utils/horarios'
import { paraOpcao } from '../../utils/opcoes'
import { calcularValorLocacao, periodosDoDia } from '../../utils/precos'
import { omitir } from '../../utils/objeto'
import AlunosDaAula from './AlunosDaAula'
import { hora, tiposAgendamento } from './descricao'

export interface InicialAgendamento {
  espacoId: Id
  data: string
  horaInicio: string
}

interface Props {
  inicial: InicialAgendamento
  /** presente = edição deste agendamento */
  agendamento?: Agendamento
  espacos: Espaco[]
  pessoas: Pessoa[]
  modalidades: Modalidade[]
  contratos: Contrato[]
  planos: Plano[]
  /** funcionamento da academia numa data; null enquanto as configurações carregam */
  funcionamentoDe: (data: string) => Funcionamento | null
  onSalvar: (dados: DadosAgendamento) => Promise<void>
  onFechar: () => void
}

const opcoesTipo: { valor: Exclude<TipoAgendamento, 'AULA_TURMA'>; rotulo: string }[] = [
  { valor: 'LOCACAO', rotulo: 'Locação / reserva' },
  { valor: 'AULA', rotulo: 'Aula' },
]

/** Uma hora depois, sem passar do fechamento (quando conhecido). */
const umaHoraDepois = (horaInicio: string, fechamento = '23:59') =>
  paraHora(Math.min(minutos(horaInicio) + 60, minutos(fechamento)))

/** Texto de ajuda do campo de data: como a academia funciona no dia escolhido. */
function descreverFuncionamento(f: Funcionamento | null) {
  if (!f) return undefined
  if (!f.aberto) return `Academia fechada nesta data${f.feriado ? ` (${f.feriado})` : ''}.`
  return `${f.feriado ? `${f.feriado}: horário especial` : 'Funcionamento'} das ${f.abertura} às ${f.fechamento}.`
}

/**
 * Cria locações e aulas, e edita qualquer agendamento (inclusive remarcar um encontro de turma).
 * Encontros de turma não são criados aqui: nascem dos horários da turma.
 */
export default function ModalAgendamento({
  inicial,
  agendamento,
  espacos,
  pessoas,
  modalidades,
  contratos,
  planos,
  funcionamentoDe,
  onSalvar,
  onFechar,
}: Props) {
  const espacoInicial = espacos.find((e) => e.id === inicial.espacoId)
  const professorAtual = agendamento?.participantes.find((p) => p.papel === 'PROFESSOR')

  const [tipo, setTipo] = useState<TipoAgendamento>(
    agendamento?.tipo ?? (espacoInicial?.locacao === 'NAO' ? 'AULA' : 'LOCACAO'),
  )
  const [espacoId, setEspacoId] = useState(inicial.espacoId)
  const [data, setData] = useState(inicial.data)
  const [horaInicio, setHoraInicio] = useState(inicial.horaInicio)
  const [horaFim, setHoraFim] = useState(() => {
    if (agendamento) return hora(agendamento.dataFim)
    const funcionamento = funcionamentoDe(inicial.data)
    return umaHoraDepois(inicial.horaInicio, funcionamento?.aberto ? funcionamento.fechamento : undefined)
  })
  const [observacao, setObservacao] = useState(agendamento?.observacao ?? '')
  // locação
  const [pessoaId, setPessoaId] = useState(agendamento?.pessoaId ? String(agendamento.pessoaId) : '')
  /** null = usa o valor da tabela; número = valor negociado pelo gestor */
  const [valorNegociado, setValorNegociado] = useState<number | null>(() => {
    if (agendamento?.valor === undefined || !espacoInicial) return null
    // valor igual ao da tabela na época: continua acompanhando a tabela se o horário mudar
    const tabela = calcularValorLocacao(espacoInicial, diaDaSemana(inicial.data), inicial.horaInicio, hora(agendamento.dataFim))
    return 'valor' in tabela && tabela.valor === agendamento.valor ? null : agendamento.valor
  })
  // aula
  const [modalidadeId, setModalidadeId] = useState(agendamento?.modalidadeId ? String(agendamento.modalidadeId) : '')
  const [professorId, setProfessorId] = useState(professorAtual ? String(professorAtual.pessoaId) : '')
  const [alunos, setAlunos] = useState<Id[]>(
    agendamento?.participantes.filter((p) => p.papel === 'ALUNO').map((p) => p.pessoaId) ?? [],
  )
  const editando = agendamento !== undefined
  const turma = tipo === 'AULA_TURMA'

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

  // locação: espaços alugáveis; aula e turma: qualquer espaço disponível (e o atual, na edição)
  const opcoesEspaco = espacos
    .filter(
      (e) => (e.status === 'ATIVO' || e.id === agendamento?.espacoId) && (tipo !== 'LOCACAO' || e.locacao !== 'NAO'),
    )
    .map(paraOpcao)

  const porPeriodo = tipo === 'LOCACAO' && espaco?.locacao === 'POR_PERIODO'
  const periodos = espaco && porPeriodo ? periodosDoDia(espaco, diaDaSemana(data)) : []
  const preco = tipo === 'LOCACAO' && espaco ? calcularValorLocacao(espaco, diaDaSemana(data), horaInicio, horaFim) : null
  const valorTabela = preco && 'valor' in preco ? preco.valor : undefined
  const valor = valorNegociado ?? valorTabela

  const responsavelAluno = pessoaId !== '' && contratosNaData(Number(pessoaId)).length > 0

  const funcionamento = funcionamentoDe(data)
  // limites dos campos de hora; em dia fechado ficam livres (o servidor recusa com a mensagem do motivo)
  const limite = funcionamento?.aberto ? funcionamento : undefined

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
    if (tipo === 'AULA_TURMA') {
      // remarcar um encontro: os participantes continuam os da turma
      return onSalvar({
        ...base,
        tipo,
        turmaId: agendamento?.turmaId,
        participantes: agendamento?.participantes.map((p) => omitir(p, 'id', 'presenca')) ?? [],
      })
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
      titulo={!editando ? 'Novo agendamento' : turma ? 'Remarcar encontro da turma' : 'Editar agendamento'}
      textoSalvar={editando ? 'Salvar alterações' : 'Agendar'}
      mensagemSucesso={
        editando
          ? 'Agendamento atualizado.'
          : tipo === 'LOCACAO'
            ? 'Locação agendada e cobrança lançada.'
            : 'Aula agendada.'
      }
      largura="grande"
      onFechar={onFechar}
      onSalvar={salvar}
    >
      {turma && (
        <Alerta tipo="info">
          Remarca só este encontro. Os alunos e o horário fixo continuam os da turma.
        </Alerta>
      )}
      <LinhaCampos>
        <Campo rotulo="Tipo" ajuda={editando && !turma ? 'O tipo não muda: para trocar, cancele e crie outro.' : undefined}>
          {editando ? (
            <Entrada value={tiposAgendamento[tipo]} readOnly />
          ) : (
            <Selecao opcoes={opcoesTipo} value={tipo} onChange={(e) => setTipo(e.target.value as TipoAgendamento)} />
          )}
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
        <Campo rotulo="Data" ajuda={descreverFuncionamento(funcionamento)} obrigatorio>
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
              min={limite?.abertura}
              max={limite?.fechamento}
              value={horaInicio}
              onChange={(e) => {
                setHoraInicio(e.target.value)
                if (e.target.value >= horaFim) setHoraFim(umaHoraDepois(e.target.value, limite?.fechamento))
              }}
              required
            />
          </Campo>
          <Campo rotulo="Fim" obrigatorio>
            <Entrada
              type="time"
              min={horaInicio}
              max={limite?.fechamento}
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
      ) : turma ? null : (
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
                // inativos saem das opções, exceto o professor atual da aula, na edição
                opcoes={pessoas
                  .filter((p) => (p.ativo && p.professor) || p.id === professorAtual?.pessoaId)
                  .map(paraOpcao)}
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
            jaNaAula={agendamento?.participantes}
          />
        </>
      )}

      <Campo rotulo="Observação">
        <AreaTexto rows={2} value={observacao} onChange={(e) => setObservacao(e.target.value)} />
      </Campo>
    </ModalFormulario>
  )
}
