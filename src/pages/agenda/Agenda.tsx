import { useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Alerta, Botao, CabecalhoPagina, CaixaSelecao, ModalMotivo } from '../../components'
import { INTERVALO_AGENDA_MIN } from '../../config'
import { useConfiguracoes } from '../../hooks/useConfiguracoes'
import { minutoDoDia, useMinutoAtual } from '../../hooks/useMinutoAtual'
import { mensagemErro, useRecurso } from '../../hooks/useRecurso'
import { useToast } from '../../hooks/useToast'
import {
  agendamentosApi,
  contratosApi,
  espacosApi,
  feriadosApi,
  modalidadesApi,
  pessoasApi,
  planosApi,
  turmasApi,
  type DadosAgendamento,
} from '../../services'
import type { Agendamento, Id, Presenca } from '../../types/models'
import { formatarDiaPorExtenso, hojeIso } from '../../utils/data'
import { funcionamentoDoDia } from '../../utils/funcionamento'
import { minutos, paraHora } from '../../utils/horarios'
import { omitir } from '../../utils/objeto'
import BarraAgenda from './BarraAgenda'
import CartaoEspaco from './CartaoEspaco'
import { hora, type CorDe, type Nomes } from './descricao'
import { LOCACOES, QUADRAS } from './filtros'
import LegendaCores from './LegendaCores'
import ModalAgendamento, { type InicialAgendamento } from './ModalAgendamento'
import ModalCores from './ModalCores'
import PainelDia from './PainelDia'
import { useAgendaDoDia } from './useAgendaDoDia'
import './Agenda.css'

/** Enquanto as cores carregam, ou se faltar a modalidade. */
const COR_NEUTRA = '#6b7280'

/** Agora arredondado para a próxima fatia da agenda, dentro do funcionamento do dia. */
function proximaFatia(abertura: number, fechamento: number) {
  const fatia = Math.ceil(minutoDoDia() / INTERVALO_AGENDA_MIN) * INTERVALO_AGENDA_MIN
  return Math.min(Math.max(fatia, abertura), fechamento - INTERVALO_AGENDA_MIN)
}

export default function Agenda() {
  const toast = useToast()
  const hoje = hojeIso()
  const minutoAtual = useMinutoAtual()
  // o painel abre a agenda num dia e agendamento específicos: /agenda?data=…&agendamento=…
  const [parametros] = useSearchParams()
  const [data, setData] = useState(parametros.get('data') ?? hoje)
  /** '' = todas; LOCACOES; ou o id de uma modalidade */
  const [atividadeFiltro, setAtividadeFiltro] = useState('')
  /** '' = todos; QUADRAS; ou o id de um espaço */
  const [espacoFiltro, setEspacoFiltro] = useState('')
  const [selecionadoId, setSelecionadoId] = useState<Id | null>(Number(parametros.get('agendamento')) || null)
  const [novo, setNovo] = useState<InicialAgendamento | null>(null)
  const [editando, setEditando] = useState<Agendamento | null>(null)
  const [cancelando, setCancelando] = useState<Agendamento | null>(null)
  /** locação cancelada: devolver o valor se a cobrança já foi paga */
  const [devolver, setDevolver] = useState(false)

  const agenda = useAgendaDoDia(data)
  const espacos = useRecurso(espacosApi)
  const pessoas = useRecurso(pessoasApi)
  const modalidades = useRecurso(modalidadesApi)
  const turmas = useRecurso(turmasApi)
  const contratos = useRecurso(contratosApi)
  const planos = useRecurso(planosApi)
  const configuracoes = useConfiguracoes()
  const feriados = useRecurso(feriadosApi)
  const [editandoCores, setEditandoCores] = useState(false)

  /** null enquanto as configurações carregam */
  const funcionamentoDe = (dia: string) =>
    configuracoes.configuracoes ? funcionamentoDoDia(configuracoes.configuracoes.funcionamento, feriados.itens, dia) : null
  const funcionamento = funcionamentoDe(data)
  // limites da linha do tempo; em dia fechado não há linha do tempo
  const [abertura, fechamento] =
    funcionamento?.aberto ? [minutos(funcionamento.abertura), minutos(funcionamento.fechamento)] : [0, 0]

  const nomes = useMemo<Nomes>(
    () => ({
      pessoa: new Map(pessoas.itens.map((p) => [p.id, p.nome])),
      modalidade: new Map(modalidades.itens.map((m) => [m.id, m.nome])),
      turma: new Map(turmas.itens.map((t) => [t.id, t.nome])),
      espaco: new Map(espacos.itens.map((e) => [e.id, e.nome])),
    }),
    [pessoas.itens, modalidades.itens, turmas.itens, espacos.itens],
  )

  // quadras primeiro; espaços inativos não aparecem (em manutenção aparecem, bloqueados)
  const espacosDaAgenda = espacos.itens
    .filter((e) => e.status !== 'INATIVO')
    .sort((a, b) => (a.tipo === b.tipo ? a.nome.localeCompare(b.nome) : a.tipo === 'QUADRA' ? -1 : 1))

  const modalidadeDaTurma = new Map(turmas.itens.map((t) => [t.id, t.modalidadeId]))
  const modalidadeDe = (a: Agendamento) =>
    a.tipo === 'AULA' ? a.modalidadeId : a.tipo === 'AULA_TURMA' ? modalidadeDaTurma.get(a.turmaId ?? 0) : undefined

  const modalidadesAtivas = modalidades.itens.filter((m) => m.ativo)
  const corModalidade = new Map(modalidades.itens.map((m) => [m.id, m.cor]))
  const corDe: CorDe = (a) =>
    a.tipo === 'LOCACAO'
      ? (configuracoes.configuracoes?.corLocacao ?? COR_NEUTRA)
      : (corModalidade.get(modalidadeDe(a) ?? 0) ?? COR_NEUTRA)

  async function salvarCores(corLocacao: string, coresModalidades: Map<Id, string>) {
    if (configuracoes.configuracoes && corLocacao !== configuracoes.configuracoes.corLocacao) {
      await configuracoes.salvar({ ...configuracoes.configuracoes, corLocacao })
    }
    for (const [id, cor] of coresModalidades) {
      const modalidade = modalidades.itens.find((m) => m.id === id)
      if (modalidade) await modalidadesApi.atualizar(id, { ...omitir(modalidade, 'id'), cor })
    }
    await modalidades.recarregar()
  }

  // filtros: atividade (o quê) e espaço (onde), combináveis
  const naAtividade = (a: Agendamento) =>
    !atividadeFiltro ||
    (atividadeFiltro === LOCACOES ? a.tipo === 'LOCACAO' : modalidadeDe(a) === Number(atividadeFiltro))
  const espacosDoFiltro = espacosDaAgenda.filter(
    (e) => !espacoFiltro || (espacoFiltro === QUADRAS ? e.tipo === 'QUADRA' : e.id === Number(espacoFiltro)),
  )
  const idsDoFiltro = new Set(espacosDoFiltro.map((e) => e.id))

  const visiveis = agenda.agendamentos.filter((a) => naAtividade(a) && idsDoFiltro.has(a.espacoId))
  const ativosVisiveis = visiveis.filter((a) => a.status !== 'CANCELADO')
  const selecionado = agenda.agendamentos.find((a) => a.id === selecionadoId) ?? null

  // filtro de espaço mostra o card mesmo vazio (para marcar algo nele);
  // só o de atividade esconde os espaços sem nada daquele tipo no dia
  // em dia fechado (ou enquanto o funcionamento carrega) não há cards
  const cartoes = !funcionamento?.aberto
    ? []
    : atividadeFiltro && !espacoFiltro
      ? espacosDoFiltro.filter((e) => ativosVisiveis.some((a) => a.espacoId === e.id))
      : espacosDoFiltro

  // com filtro de atividade ou em outro dia: rola para o primeiro agendamento; hoje: para agora
  const primeiro = ativosVisiveis[0]
  const rolarPara =
    data === hoje && !atividadeFiltro
      ? proximaFatia(abertura, fechamento)
      : primeiro
        ? minutos(hora(primeiro.dataInicio))
        : abertura

  const painel = useRef<HTMLDivElement>(null)

  /** Bloco tocado num card: abre o detalhe; sem coluna lateral (celular/tablet), rola até ele. */
  function selecionarBloco(a: Agendamento) {
    setSelecionadoId(a.id)
    if (window.matchMedia('(max-width: 1100px)').matches) {
      painel.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  function irPara(novaData: string) {
    setData(novaData)
    setSelecionadoId(null)
  }

  function novoAgendamento(espacoId?: Id, horaInicio?: string) {
    const padrao = espacosDaAgenda.find((e) => e.status === 'ATIVO' && e.locacao !== 'NAO') ?? espacosDaAgenda[0]
    setNovo({
      espacoId: espacoId ?? padrao?.id ?? 0,
      data,
      horaInicio:
        horaInicio ??
        (funcionamento?.aberto ? paraHora(data === hoje ? proximaFatia(abertura, fechamento) : abertura) : '08:00'),
    })
  }

  async function criar(dados: DadosAgendamento) {
    const criado = await agendamentosApi.criar(dados)
    agenda.recarregar()
    // agendar em outro dia leva a agenda até ele; a lista continua visível (o toast confirma)
    irPara(criado.dataInicio.slice(0, 10))
  }

  /** Modal aberto: novo agendamento ou edição (que parte do próprio agendamento). */
  const inicialDoModal: InicialAgendamento | null = editando
    ? { espacoId: editando.espacoId, data: editando.dataInicio.slice(0, 10), horaInicio: hora(editando.dataInicio) }
    : novo

  async function salvarEdicao(original: Agendamento, dados: DadosAgendamento) {
    const salvo = await agendamentosApi.atualizar(original.id, dados)
    agenda.recarregar()
    // remarcar para outro dia leva a agenda até ele, com o detalhe ainda aberto
    irPara(salvo.dataInicio.slice(0, 10))
    setSelecionadoId(salvo.id)
  }

  function registrarPresenca(a: Agendamento, participanteId: Id, presenca: Presenca) {
    agendamentosApi
      .registrarPresenca(a.id, participanteId, presenca)
      .then(() => {
        toast.sucesso('Presença registrada.')
        agenda.recarregar()
      })
      .catch((e: unknown) => toast.erro(mensagemErro(e)))
  }

  async function cancelar(motivo: string) {
    if (!cancelando) return
    await agendamentosApi.cancelar(cancelando.id, motivo, { devolver })
    agenda.recarregar()
  }

  const erro =
    agenda.erro ??
    espacos.erro ??
    pessoas.erro ??
    modalidades.erro ??
    turmas.erro ??
    contratos.erro ??
    planos.erro ??
    configuracoes.erro ??
    feriados.erro
  const diaPorExtenso = formatarDiaPorExtenso(data)

  return (
    <>
      <CabecalhoPagina
        titulo="Agenda"
        descricao={diaPorExtenso[0].toUpperCase() + diaPorExtenso.slice(1)}
        acoes={<Botao onClick={() => novoAgendamento()}>Novo agendamento</Botao>}
      />

      {erro && <Alerta tipo="erro">{erro}</Alerta>}

      <BarraAgenda
        data={data}
        hoje={hoje}
        onIrPara={irPara}
        atividade={atividadeFiltro}
        onAtividade={setAtividadeFiltro}
        espaco={espacoFiltro}
        onEspaco={setEspacoFiltro}
        modalidades={modalidades.itens}
        espacos={espacosDaAgenda}
      >
        <LegendaCores
          corLocacao={configuracoes.configuracoes?.corLocacao ?? COR_NEUTRA}
          modalidades={modalidadesAtivas}
          onEditar={() => setEditandoCores(true)}
        />
      </BarraAgenda>

      <div className="agenda">
        <div className="agenda-cartoes">
          {funcionamento && !funcionamento.aberto && (
            <p className="agenda-sem-resultado">
              Academia fechada neste dia{funcionamento.feriado && ` (${funcionamento.feriado})`}. O horário de
              funcionamento é definido em Configurações.
            </p>
          )}
          {funcionamento?.aberto && funcionamento.feriado && (
            <Alerta tipo="info">
              Feriado: {funcionamento.feriado}. Horário especial das {funcionamento.abertura} às{' '}
              {funcionamento.fechamento}.
            </Alerta>
          )}
          {/* só o filtro de atividade esvazia a lista de cards */}
          {funcionamento?.aberto && atividadeFiltro && cartoes.length === 0 && !agenda.carregando && (
            <p className="agenda-sem-resultado">
              Nenhum agendamento de{' '}
              {atividadeFiltro === LOCACOES ? 'locação' : nomes.modalidade.get(Number(atividadeFiltro))} neste dia.
            </p>
          )}
          {cartoes.map((espaco) => {
            const doEspaco = ativosVisiveis.filter((a) => a.espacoId === espaco.id)
            // com filtro de atividade, cada card mostra o seu primeiro agendamento filtrado
            const rolarCard =
              atividadeFiltro && doEspaco[0] ? minutos(hora(doEspaco[0].dataInicio)) : rolarPara
            return (
              <CartaoEspaco
                key={espaco.id}
                espaco={espaco}
                abertura={abertura}
                fechamento={fechamento}
                agendamentos={doEspaco}
                nomes={nomes}
                corDe={corDe}
                selecionadoId={selecionadoId}
                minutoAtual={data === hoje ? minutoAtual : null}
                rolarPara={rolarCard}
                onSelecionar={selecionarBloco}
                onHorarioLivre={(hora) => novoAgendamento(espaco.id, hora)}
              />
            )
          })}
        </div>

        <div className="agenda-painel" ref={painel}>
          <PainelDia
            agendamentos={visiveis}
            nomes={nomes}
            corDe={corDe}
            selecionado={selecionado}
            carregando={agenda.carregando}
            onSelecionar={(a) => setSelecionadoId(a?.id ?? null)}
            onPresenca={registrarPresenca}
            onEditar={setEditando}
            onCancelar={setCancelando}
          />
        </div>
      </div>

      {editandoCores && configuracoes.configuracoes && (
        <ModalCores
          corLocacao={configuracoes.configuracoes.corLocacao}
          modalidades={modalidadesAtivas}
          onSalvar={salvarCores}
          onFechar={() => setEditandoCores(false)}
        />
      )}

      {inicialDoModal && (
        <ModalAgendamento
          inicial={inicialDoModal}
          agendamento={editando ?? undefined}
          espacos={espacos.itens}
          pessoas={pessoas.itens}
          modalidades={modalidades.itens}
          contratos={contratos.itens}
          planos={planos.itens}
          funcionamentoDe={funcionamentoDe}
          onSalvar={editando ? (dados) => salvarEdicao(editando, dados) : criar}
          onFechar={() => {
            setNovo(null)
            setEditando(null)
          }}
        />
      )}

      {cancelando && (
        <ModalMotivo
          titulo="Cancelar agendamento"
          textoConfirmar="Cancelar agendamento"
          mensagemSucesso="Agendamento cancelado."
          onConfirmar={cancelar}
          onFechar={() => {
            setCancelando(null)
            setDevolver(false)
          }}
        >
          {cancelando.tipo === 'LOCACAO' && (
            <>
              <Alerta tipo="info">A cobrança em aberto desta locação também será cancelada.</Alerta>
              <CaixaSelecao
                rotulo="Se a cobrança já foi paga, registrar a devolução do valor"
                checked={devolver}
                onChange={(e) => setDevolver(e.target.checked)}
              />
            </>
          )}
        </ModalMotivo>
      )}
    </>
  )
}
