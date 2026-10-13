import { Botao, Etiqueta, Selecao } from '../../components'
import type { Agendamento, Id, PapelParticipante, Presenca } from '../../types/models'
import { formatarMoeda } from '../../utils/formatar'
import { descrever, estiloCor, hora, tiposAgendamento, type CorDe, type Nomes } from './descricao'
import SeloTipo from './SeloTipo'
import './PainelDia.css'

const presencas: Record<Presenca, string> = {
  PENDENTE: 'Pendente',
  PRESENTE: 'Presente',
  FALTA: 'Falta',
  FALTA_JUSTIFICADA: 'Falta justificada',
}

const opcoesPresenca = Object.entries(presencas).map(([valor, rotulo]) => ({ valor, rotulo }))

const papeis: Record<PapelParticipante, string> = { PROFESSOR: 'Professor', ALUNO: 'Aluno', JOGADOR: 'Jogador' }

interface Props {
  agendamentos: Agendamento[]
  nomes: Nomes
  corDe: CorDe
  selecionado: Agendamento | null
  carregando: boolean
  onSelecionar: (agendamento: Agendamento | null) => void
  onPresenca: (agendamento: Agendamento, participanteId: Id, presenca: Presenca) => void
  onEditar: (agendamento: Agendamento) => void
  onCancelar: (agendamento: Agendamento) => void
}

/** Lista do dia em ordem de horário; ao clicar, mostra o detalhe no lugar da lista. */
export default function PainelDia({
  agendamentos,
  nomes,
  corDe,
  selecionado,
  carregando,
  onSelecionar,
  onPresenca,
  onEditar,
  onCancelar,
}: Props) {
  if (selecionado) {
    const a = selecionado
    const { titulo } = descrever(a, nomes)
    const cancelado = a.status === 'CANCELADO'
    return (
      <aside className="painel-dia" aria-label="Agenda do dia">
        <Botao variante="fantasma" pequeno onClick={() => onSelecionar(null)}>
          ← Voltar à lista
        </Botao>
        <h2 className="painel-dia-titulo">{titulo}</h2>
        <dl className="painel-dia-dados">
          <dt>Tipo</dt>
          <dd>{tiposAgendamento[a.tipo]}</dd>
          <dt>Local</dt>
          <dd>{nomes.espaco.get(a.espacoId)}</dd>
          <dt>Horário</dt>
          <dd>
            {hora(a.dataInicio)}–{hora(a.dataFim)}
          </dd>
          {a.tipo === 'LOCACAO' && (
            <>
              <dt>Responsável</dt>
              <dd>{nomes.pessoa.get(a.pessoaId ?? 0)}</dd>
              <dt>Valor</dt>
              <dd>{formatarMoeda(a.valor ?? 0)}</dd>
            </>
          )}
          {a.observacao && (
            <>
              <dt>{cancelado ? 'Motivo do cancelamento' : 'Observação'}</dt>
              <dd>{a.observacao}</dd>
            </>
          )}
          <dt>Situação</dt>
          <dd>{cancelado ? <Etiqueta cor="vermelho">Cancelado</Etiqueta> : <Etiqueta cor="azul">Agendado</Etiqueta>}</dd>
        </dl>

        {a.participantes.length > 0 && (
          <>
            <h3 className="painel-dia-subtitulo">Presença</h3>
            <ul className="painel-dia-participantes">
              {a.participantes.map((p) => (
                <li key={p.id}>
                  <span>
                    {nomes.pessoa.get(p.pessoaId)}
                    <small>{papeis[p.papel]}</small>
                  </span>
                  <Selecao
                    aria-label={`Presença de ${nomes.pessoa.get(p.pessoaId)}`}
                    opcoes={opcoesPresenca}
                    value={p.presenca}
                    disabled={cancelado}
                    onChange={(e) => onPresenca(a, p.id, e.target.value as Presenca)}
                  />
                </li>
              ))}
            </ul>
          </>
        )}

        {!cancelado && (
          <div className="painel-dia-acoes">
            <Botao variante="secundario" onClick={() => onEditar(a)}>
              {a.tipo === 'AULA_TURMA' ? 'Remarcar' : 'Editar'}
            </Botao>
            <Botao variante="perigo" onClick={() => onCancelar(a)}>
              Cancelar agendamento
            </Botao>
          </div>
        )}
      </aside>
    )
  }

  return (
    <aside className="painel-dia" aria-label="Agenda do dia">
      <h2 className="painel-dia-titulo">Agenda do dia</h2>
      {carregando && <p className="painel-dia-vazio">Carregando…</p>}
      {!carregando && agendamentos.length === 0 && <p className="painel-dia-vazio">Nenhum agendamento neste dia.</p>}
      <ul className="painel-dia-lista">
        {agendamentos.map((a) => {
          const { titulo, subtitulo } = descrever(a, nomes)
          return (
            <li key={a.id}>
              <button
                type="button"
                className={`painel-dia-item agenda-bloco${a.status === 'CANCELADO' ? ' cancelado' : ''}`}
                style={estiloCor(corDe(a))}
                onClick={() => onSelecionar(a)}
              >
                <span className="painel-dia-hora">
                  {hora(a.dataInicio)}–{hora(a.dataFim)} · {nomes.espaco.get(a.espacoId)}
                </span>
                <strong>
                  {titulo} <SeloTipo tipo={a.tipo} />
                </strong>
                <span>{a.status === 'CANCELADO' ? 'Cancelado' : subtitulo}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </aside>
  )
}
