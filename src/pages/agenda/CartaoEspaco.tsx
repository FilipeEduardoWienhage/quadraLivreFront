import { useEffect, useRef } from 'react'
import { INTERVALO_AGENDA_MIN } from '../../config'
import type { Agendamento, Espaco, Id } from '../../types/models'
import { pluralizar } from '../../utils/formatar'
import { minutos, paraHora } from '../../utils/horarios'
import { descrever, estiloCor, hora, type CorDe, type Nomes } from './descricao'
import SeloTipo from './SeloTipo'
import './CartaoEspaco.css'

/** Altura de um minuto na linha do tempo. */
const PX_POR_MIN = 1.2

/** Abaixo desta altura o bloco mostra só uma linha. */
const ALTURA_COMPACTA = 46

interface Props {
  espaco: Espaco
  /** funcionamento do dia, em minutos desde 00:00 */
  abertura: number
  fechamento: number
  /** agendamentos do espaço no dia, sem os cancelados */
  agendamentos: Agendamento[]
  nomes: Nomes
  corDe: CorDe
  selecionadoId: Id | null
  /** minuto do dia agora, só quando o dia exibido é hoje */
  minutoAtual: number | null
  /** minuto do dia para onde rolar ao abrir (ex.: hora atual) */
  rolarPara: number
  onSelecionar: (agendamento: Agendamento) => void
  onHorarioLivre: (hora: string) => void
}

const contar = (n: number) => (n === 0 ? 'Nenhum agendamento' : pluralizar(n, 'agendamento', 'agendamentos'))

export default function CartaoEspaco({
  espaco,
  abertura,
  fechamento,
  agendamentos,
  nomes,
  corDe,
  selecionadoId,
  minutoAtual,
  rolarPara,
  onSelecionar,
  onHorarioLivre,
}: Props) {
  const linhaDoTempo = useRef<HTMLDivElement>(null)
  const disponivel = espaco.status === 'ATIVO'

  const px = (minutoDoDia: number) => (minutoDoDia - abertura) * PX_POR_MIN
  // a grade começa na abertura, mesmo que ela não seja hora cheia (ex.: 08:15)
  const fatias = Array.from(
    { length: Math.ceil((fechamento - abertura) / INTERVALO_AGENDA_MIN) },
    (_, i) => abertura + i * INTERVALO_AGENDA_MIN,
  )

  useEffect(() => {
    // deixa meia hora de contexto acima do horário de interesse
    linhaDoTempo.current?.scrollTo({ top: Math.max(0, (rolarPara - 30 - abertura) * PX_POR_MIN) })
  }, [rolarPara, abertura])

  const intervalo = (a: Agendamento) => [minutos(hora(a.dataInicio)), minutos(hora(a.dataFim))] as const
  const ocupado = (fatia: number) =>
    agendamentos.some((a) => {
      const [inicio, fim] = intervalo(a)
      return inicio < fatia + INTERVALO_AGENDA_MIN && fim > fatia
    })

  const emUso =
    minutoAtual !== null &&
    agendamentos.find((a) => {
      const [inicio, fim] = intervalo(a)
      return inicio <= minutoAtual && minutoAtual < fim
    })

  const selo = !disponivel
    ? { texto: espaco.status === 'MANUTENCAO' ? 'Em manutenção' : 'Inativo', tom: 'indisponivel' }
    : emUso
      ? { texto: `Em uso até ${hora(emUso.dataFim)}`, tom: 'em-uso' }
      : minutoAtual === null
        ? null
        : minutoAtual < abertura || minutoAtual >= fechamento
          ? { texto: 'Fora do horário', tom: 'indisponivel' }
          : { texto: 'Livre agora', tom: 'livre' }

  const agoraVisivel = minutoAtual !== null && minutoAtual > abertura && minutoAtual < fechamento

  return (
    <section className={`cartao-espaco${disponivel ? '' : ' cartao-espaco-indisponivel'}`} aria-label={espaco.nome}>
      <header className="cartao-espaco-cabecalho">
        <div>
          <h2>{espaco.nome}</h2>
          <span className="cartao-espaco-resumo">{contar(agendamentos.length)}</span>
        </div>
        {selo && <span className={`cartao-espaco-selo cartao-espaco-selo-${selo.tom}`}>{selo.texto}</span>}
      </header>

      <div className="cartao-espaco-linha" ref={linhaDoTempo}>
        <div className="cartao-espaco-dia" style={{ height: px(fechamento) }}>
          {fatias.map((fatia) => {
            const horaFatia = paraHora(fatia)
            const passou = minutoAtual !== null && fatia + INTERVALO_AGENDA_MIN <= minutoAtual
            // rótulo nas horas cheias e na abertura, se ela for quebrada
            const rotulo = fatia % 60 === 0 || fatia === abertura
            return (
              <div
                key={fatia}
                className={`cartao-espaco-fatia${rotulo ? ' cartao-espaco-hora-cheia' : ''}`}
                style={{ height: INTERVALO_AGENDA_MIN * PX_POR_MIN }}
              >
                {rotulo && <span className="cartao-espaco-rotulo">{horaFatia}</span>}
                {disponivel && !passou && !ocupado(fatia) && (
                  <button
                    type="button"
                    className="cartao-espaco-livre"
                    aria-label={`Agendar ${espaco.nome} às ${horaFatia}`}
                    onClick={() => onHorarioLivre(horaFatia)}
                  >
                    <span>+ {horaFatia}</span>
                  </button>
                )}
              </div>
            )
          })}

          {minutoAtual !== null && minutoAtual > abertura && (
            <div className="cartao-espaco-passado" style={{ height: px(Math.min(minutoAtual, fechamento)) }} />
          )}

          {agendamentos.map((a) => {
            const [inicio, fim] = intervalo(a)
            const altura = (fim - inicio) * PX_POR_MIN
            const { titulo, subtitulo } = descrever(a, nomes)
            const compacto = altura < ALTURA_COMPACTA
            return (
              <button
                type="button"
                key={a.id}
                className={`cartao-espaco-bloco agenda-bloco${compacto ? ' compacto' : ''}${a.id === selecionadoId ? ' selecionado' : ''}`}
                style={{ ...estiloCor(corDe(a)), top: px(inicio), height: altura }}
                title={`${hora(a.dataInicio)}–${hora(a.dataFim)} · ${titulo} · ${subtitulo}`}
                onClick={() => onSelecionar(a)}
              >
                <span className="cartao-espaco-bloco-hora">
                  {hora(a.dataInicio)}–{hora(a.dataFim)}
                  <SeloTipo tipo={a.tipo} />
                </span>
                <strong>{titulo}</strong>
                {!compacto && <span className="cartao-espaco-bloco-sub">{subtitulo}</span>}
              </button>
            )
          })}

          {agoraVisivel && (
            <div className="cartao-espaco-agora" style={{ top: px(minutoAtual) }} aria-hidden="true" />
          )}
        </div>
      </div>
    </section>
  )
}
