import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Alerta, CabecalhoPagina, CartaoResumo } from '../../components'
import { useConfiguracoes } from '../../hooks/useConfiguracoes'
import { useMinutoAtual } from '../../hooks/useMinutoAtual'
import { useRecurso } from '../../hooks/useRecurso'
import { useToast } from '../../hooks/useToast'
import {
  espacosApi,
  feriadosApi,
  formasPagamentoApi,
  modalidadesApi,
  pessoasApi,
  planosApi,
  transacoesApi,
  turmasApi,
} from '../../services'
import type { Transacao } from '../../types/models'
import { formatarDiaPorExtenso, hojeIso } from '../../utils/data'
import { formatarCompetencia, formatarMoeda, pluralizar } from '../../utils/formatar'
import { funcionamentoDoDia } from '../../utils/funcionamento'
import { minutos } from '../../utils/horarios'
import { hora, type Nomes } from '../agenda/descricao'
import { useAgendaDoDia } from '../agenda/useAgendaDoDia'
import ModalPagamento from '../financeiro/ModalPagamento'
import AgendaDeHoje from './AgendaDeHoje'
import Pendencias from './Pendencias'
import { useResumoPainel } from './useResumoPainel'
import './PainelInicial.css'

const saudacao = (minuto: number) => (minuto < 12 * 60 ? 'Bom dia' : minuto < 18 * 60 ? 'Boa tarde' : 'Boa noite')

/** "7,5 h" — horas a partir de minutos, com uma casa só quando precisa. */
const formatarHoras = (totalMinutos: number) =>
  `${(totalMinutos / 60).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} h`

/** Valor do indicador enquanto carrega: "…" em vez de zeros que parecem dados. */
const CARREGANDO = '…'

/** Página inicial do gestor: o dia de hoje, o dinheiro do mês e o que precisa de atenção. */
export default function PainelInicial() {
  const toast = useToast()
  const hoje = hojeIso()
  const minutoAtual = useMinutoAtual()
  const agenda = useAgendaDoDia(hoje)
  const painel = useResumoPainel()
  const espacos = useRecurso(espacosApi)
  const pessoas = useRecurso(pessoasApi)
  const modalidades = useRecurso(modalidadesApi)
  const turmas = useRecurso(turmasApi)
  const planos = useRecurso(planosApi)
  const formas = useRecurso(formasPagamentoApi)
  const feriados = useRecurso(feriadosApi)
  const configuracoes = useConfiguracoes()
  const [pagando, setPagando] = useState<Transacao | null>(null)

  const nomes = useMemo<Nomes>(
    () => ({
      pessoa: new Map(pessoas.itens.map((p) => [p.id, p.nome])),
      modalidade: new Map(modalidades.itens.map((m) => [m.id, m.nome])),
      turma: new Map(turmas.itens.map((t) => [t.id, t.nome])),
      espaco: new Map(espacos.itens.map((e) => [e.id, e.nome])),
    }),
    [pessoas.itens, modalidades.itens, turmas.itens, espacos.itens],
  )
  const nomePlano = useMemo(() => new Map(planos.itens.map((p) => [p.id, p.nome])), [planos.itens])

  const funcionamento = configuracoes.configuracoes
    ? funcionamentoDoDia(configuracoes.configuracoes.funcionamento, feriados.itens, hoje)
    : null
  const agendamentos = agenda.agendamentos.filter((a) => a.status !== 'CANCELADO')
  const quadras = espacos.itens.filter((e) => e.tipo === 'QUADRA' && e.status === 'ATIVO')

  // ocupação das quadras: horas agendadas ÷ horas abertas × quadras
  const ocupacao = (() => {
    if (!funcionamento?.aberto || !quadras.length) return null
    const [abre, fecha] = [minutos(funcionamento.abertura), minutos(funcionamento.fechamento)]
    const idsQuadras = new Set(quadras.map((q) => q.id))
    const ocupado = agendamentos
      .filter((a) => idsQuadras.has(a.espacoId))
      .reduce(
        (soma, a) =>
          soma + Math.max(Math.min(minutos(hora(a.dataFim)), fecha) - Math.max(minutos(hora(a.dataInicio)), abre), 0),
        0,
      )
    const capacidade = (fecha - abre) * quadras.length
    return { ocupado, capacidade, percentual: Math.round((ocupado / capacidade) * 100) }
  })()

  const carregandoDia = agenda.carregando || espacos.carregando || !funcionamento
  const aulas = agendamentos.filter((a) => a.tipo !== 'LOCACAO').length
  const locacoes = agendamentos.length - aulas
  const resumo = painel.resumo
  const emAtraso = resumo?.cobrancasVencidas.reduce((soma, t) => soma + t.valorTotal, 0) ?? 0

  async function gerarMensalidades() {
    const competencia = hoje.slice(0, 7)
    const criadas = await transacoesApi.gerarMensalidades(competencia)
    toast.sucesso(`${pluralizar(criadas, 'mensalidade gerada', 'mensalidades geradas')} para ${formatarCompetencia(competencia)}.`)
    painel.recarregar()
  }

  const erro =
    painel.erro ?? agenda.erro ?? espacos.erro ?? pessoas.erro ?? planos.erro ?? formas.erro ?? configuracoes.erro

  return (
    <>
      <CabecalhoPagina
        titulo={`${saudacao(minutoAtual)}!`}
        descricao={formatarDiaPorExtenso(hoje)}
        acoes={
          <>
            <Link to="/financeiro" className="botao botao-secundario">
              Financeiro
            </Link>
            <Link to="/agenda" className="botao botao-primario">
              Abrir agenda
            </Link>
          </>
        }
      />

      {erro && <Alerta tipo="erro">{erro}</Alerta>}

      <div className="painel-inicial-indicadores">
        <CartaoResumo
          rotulo="Hoje"
          valor={carregandoDia ? CARREGANDO : pluralizar(agendamentos.length, 'agendamento', 'agendamentos')}
          detalhe={
            carregandoDia
              ? undefined
              : `${pluralizar(aulas, 'aula', 'aulas')} · ${pluralizar(locacoes, 'locação', 'locações')}`
          }
        />
        <CartaoResumo
          rotulo="Ocupação das quadras"
          valor={carregandoDia ? CARREGANDO : ocupacao ? `${ocupacao.percentual}%` : '—'}
          detalhe={
            ocupacao && !carregandoDia
              ? `${formatarHoras(ocupacao.ocupado)} de ${formatarHoras(ocupacao.capacidade)}`
              : funcionamento && !funcionamento.aberto
                ? 'Fechado hoje'
                : undefined
          }
        />
        <CartaoResumo
          rotulo="Em atraso"
          valor={resumo ? formatarMoeda(emAtraso) : CARREGANDO}
          detalhe={resumo && pluralizar(resumo.cobrancasVencidas.length, 'cobrança vencida', 'cobranças vencidas')}
          tom={emAtraso > 0 ? 'alerta' : 'neutro'}
        />
        <CartaoResumo
          rotulo="Recebido no mês"
          valor={resumo ? formatarMoeda(resumo.recebidoNoMes) : CARREGANDO}
          detalhe={resumo && `de ${formatarMoeda(resumo.previstoNoMes)} previstos`}
          tom="positivo"
        />
      </div>

      <div className="painel-inicial-colunas">
        <AgendaDeHoje
          agendamentos={agendamentos}
          quadras={quadras}
          nomes={nomes}
          funcionamento={funcionamento}
          minutoAtual={minutoAtual}
          carregando={carregandoDia}
        />
        {resumo ? (
          <Pendencias
            resumo={resumo}
            hoje={hoje}
            nomes={nomes}
            nomePlano={nomePlano}
            onPagar={setPagando}
            onGerarMensalidades={gerarMensalidades}
          />
        ) : (
          <section className="painel-inicial-bloco">
            <p className="painel-inicial-vazio">Carregando pendências…</p>
          </section>
        )}
      </div>

      {pagando && (
        <ModalPagamento
          transacao={pagando}
          formas={formas.itens}
          onSalvar={async (pagamento) => {
            await transacoesApi.registrarPagamento(pagando.id, pagamento)
            painel.recarregar()
          }}
          onFechar={() => setPagando(null)}
        />
      )}
    </>
  )
}
