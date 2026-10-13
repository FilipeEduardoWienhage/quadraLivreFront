import { Link } from 'react-router-dom'
import { Etiqueta, type CorEtiqueta } from '../../components'
import type { Agendamento, Espaco, TipoAgendamento } from '../../types/models'
import type { Funcionamento } from '../../utils/funcionamento'
import { janelasLivres, minutos, paraHora } from '../../utils/horarios'
import { descrever, hora, tiposAgendamento, type Nomes } from '../agenda/descricao'

/** Quantos agendamentos "a seguir" listar; o resto fica na agenda. */
const LIMITE_A_SEGUIR = 6
/** Janela livre mínima que vale anunciar (minutos). */
const JANELA_MINIMA = 60

const corDoTipo: Record<TipoAgendamento, CorEtiqueta> = { LOCACAO: 'cinza', AULA: 'azul', AULA_TURMA: 'verde' }

interface Props {
  /** agendamentos de hoje, já sem os cancelados */
  agendamentos: Agendamento[]
  quadras: Espaco[]
  nomes: Nomes
  /** null enquanto as configurações carregam */
  funcionamento: Funcionamento | null
  minutoAtual: number
  carregando: boolean
}

/** O que acontece agora, o que vem a seguir e onde ainda há quadra livre hoje. */
export default function AgendaDeHoje({ agendamentos, quadras, nomes, funcionamento, minutoAtual, carregando }: Props) {
  const inicio = (a: Agendamento) => minutos(hora(a.dataInicio))
  const fim = (a: Agendamento) => minutos(hora(a.dataFim))

  const agora = agendamentos.filter((a) => inicio(a) <= minutoAtual && fim(a) > minutoAtual)
  const aSeguir = agendamentos.filter((a) => inicio(a) > minutoAtual)

  const livres = funcionamento?.aberto
    ? quadras
        .map((q) => ({
          quadra: q,
          janelas: janelasLivres(
            agendamentos.filter((a) => a.espacoId === q.id).map((a) => [inicio(a), fim(a)]),
            Math.max(minutos(funcionamento.abertura), minutoAtual),
            minutos(funcionamento.fechamento),
            JANELA_MINIMA,
          ),
        }))
        .filter((l) => l.janelas.length)
    : []

  const item = (a: Agendamento) => {
    const { titulo, subtitulo } = descrever(a, nomes)
    return (
      <li key={a.id}>
        <Link to={`/agenda?agendamento=${a.id}`} className="painel-inicial-agendamento">
          <span className="painel-inicial-hora">
            {hora(a.dataInicio)}–{hora(a.dataFim)}
          </span>
          <span className="painel-inicial-agendamento-texto">
            <strong>
              {titulo} <Etiqueta cor={corDoTipo[a.tipo]}>{tiposAgendamento[a.tipo]}</Etiqueta>
            </strong>
            <span>
              {nomes.espaco.get(a.espacoId)} · {subtitulo}
            </span>
          </span>
        </Link>
      </li>
    )
  }

  return (
    <section className="painel-inicial-bloco" aria-labelledby="painel-agenda-titulo">
      <header className="painel-inicial-bloco-cabecalho">
        <h2 id="painel-agenda-titulo">Agora e a seguir</h2>
        <Link to="/agenda" className="botao botao-fantasma botao-pequeno">
          Ver agenda
        </Link>
      </header>

      {carregando || !funcionamento ? (
        <p className="painel-inicial-vazio">Carregando a agenda de hoje…</p>
      ) : !funcionamento.aberto ? (
        <p className="painel-inicial-vazio">Fechado hoje{funcionamento.feriado && ` (${funcionamento.feriado})`}.</p>
      ) : (
        <>
          {agora.length > 0 && (
            <>
              <h3 className="painel-inicial-subtitulo painel-inicial-agora">Agora</h3>
              <ul className="painel-inicial-lista">{agora.map(item)}</ul>
            </>
          )}
          <h3 className="painel-inicial-subtitulo">A seguir</h3>
          {aSeguir.length ? (
            <ul className="painel-inicial-lista">{aSeguir.slice(0, LIMITE_A_SEGUIR).map(item)}</ul>
          ) : (
            <p className="painel-inicial-vazio">Nada mais agendado para hoje.</p>
          )}
          {aSeguir.length > LIMITE_A_SEGUIR && (
            <Link to="/agenda" className="painel-inicial-mais">
              e mais {aSeguir.length - LIMITE_A_SEGUIR} na agenda
            </Link>
          )}

          <h3 className="painel-inicial-subtitulo">Quadras livres hoje</h3>
          {livres.length ? (
            <ul className="painel-inicial-livres">
              {livres.map(({ quadra, janelas }) => (
                <li key={quadra.id}>
                  <strong>{quadra.nome}</strong> {janelas.map(([de, ate]) => `${paraHora(de)}–${paraHora(ate)}`).join(', ')}
                </li>
              ))}
            </ul>
          ) : (
            <p className="painel-inicial-vazio">Nenhum horário livre de {JANELA_MINIMA} min ou mais.</p>
          )}
        </>
      )}
    </section>
  )
}
