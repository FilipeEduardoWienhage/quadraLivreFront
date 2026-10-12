import { useMemo, useState } from 'react'
import {
  Alerta,
  BarraFiltros,
  Botao,
  CabecalhoPagina,
  CampoBusca,
  Entrada,
  Etiqueta,
  Selecao,
  Tabela,
  type Coluna,
  type CorEtiqueta,
} from '../../components'
import { useRecurso } from '../../hooks/useRecurso'
import { useToast } from '../../hooks/useToast'
import {
  categoriasDespesaApi,
  formasPagamentoApi,
  pessoasApi,
  servicosApi,
  transacoesApi,
  type DadosTransacao,
} from '../../services'
import type { TipoTransacao, Transacao } from '../../types/models'
import { hojeIso } from '../../utils/data'
import { formatarCompetencia, formatarData, formatarMoeda, pluralizar } from '../../utils/formatar'
import { contemTermo } from '../../utils/texto'
import DetalheTransacao from './DetalheTransacao'
import ModalCancelamento from './ModalCancelamento'
import ModalDespesa from './ModalDespesa'
import ModalMensalidades from './ModalMensalidades'
import ModalPagamento from './ModalPagamento'
import ModalReceita from './ModalReceita'
import ResumoFinanceiro from './ResumoFinanceiro'
import './Financeiro.css'

/** "Vencida" não é status gravado: é uma ABERTA com vencimento no passado. */
type Situacao = 'ABERTA' | 'VENCIDA' | 'PAGA' | 'CANCELADA'

const situacoes: Record<Situacao, { rotulo: string; cor: CorEtiqueta }> = {
  ABERTA: { rotulo: 'Em aberto', cor: 'azul' },
  VENCIDA: { rotulo: 'Vencida', cor: 'vermelho' },
  PAGA: { rotulo: 'Paga', cor: 'verde' },
  CANCELADA: { rotulo: 'Cancelada', cor: 'cinza' },
}

type FiltroSituacao = 'PENDENTES' | Situacao | ''

const opcoesSituacao: { valor: FiltroSituacao; rotulo: string }[] = [
  { valor: 'PENDENTES', rotulo: 'Pendentes (em aberto e vencidas)' },
  { valor: 'VENCIDA', rotulo: 'Só vencidas' },
  { valor: 'PAGA', rotulo: 'Pagas' },
  { valor: 'CANCELADA', rotulo: 'Canceladas' },
]

const opcoesTipo = [
  { valor: 'RECEITA', rotulo: 'Receitas' },
  { valor: 'DESPESA', rotulo: 'Despesas' },
]

type Acao =
  | { tipo: 'detalhe' | 'pagamento' | 'cancelamento'; transacao: Transacao }
  | { tipo: 'receita' | 'despesa' | 'mensalidades' }

export default function Financeiro() {
  const toast = useToast()
  const transacoes = useRecurso(transacoesApi)
  const pessoas = useRecurso(pessoasApi)
  const categorias = useRecurso(categoriasDespesaApi)
  const formas = useRecurso(formasPagamentoApi)
  const servicos = useRecurso(servicosApi)

  const [busca, setBusca] = useState('')
  const [tipoFiltro, setTipoFiltro] = useState<TipoTransacao | ''>('')
  const [situacaoFiltro, setSituacaoFiltro] = useState<FiltroSituacao>('PENDENTES')
  const [mesFiltro, setMesFiltro] = useState('')
  const [acao, setAcao] = useState<Acao | null>(null)

  const hoje = hojeIso()
  const situacao = (t: Transacao): Situacao => (t.status === 'ABERTA' && t.dataVencimento < hoje ? 'VENCIDA' : t.status)

  const nomePessoa = useMemo(() => new Map(pessoas.itens.map((p) => [p.id, p.nome])), [pessoas.itens])
  const nomeCategoria = useMemo(() => new Map(categorias.itens.map((c) => [c.id, c.nome])), [categorias.itens])
  const nomeForma = useMemo(() => new Map(formas.itens.map((f) => [f.id, f.descricao])), [formas.itens])

  /** Receita: quem paga. Despesa: categoria (e o favorecido, se houver). */
  const titulo = (t: Transacao) =>
    t.tipo === 'RECEITA'
      ? (nomePessoa.get(t.pessoaId ?? 0) ?? '—')
      : [nomeCategoria.get(t.categoriaId ?? 0), t.pessoaId && nomePessoa.get(t.pessoaId)].filter(Boolean).join(' — ')

  const filtradas = transacoes.itens
    .filter((t) => {
      const s = situacao(t)
      const situacaoOk =
        !situacaoFiltro || (situacaoFiltro === 'PENDENTES' ? s === 'ABERTA' || s === 'VENCIDA' : s === situacaoFiltro)
      return (
        situacaoOk &&
        (!tipoFiltro || t.tipo === tipoFiltro) &&
        (!mesFiltro || t.dataVencimento.startsWith(mesFiltro)) &&
        contemTermo(busca, titulo(t), ...t.movimentos.map((m) => m.descricao))
      )
    })
    .sort((a, b) => a.dataVencimento.localeCompare(b.dataVencimento))

  const colunas: Coluna<Transacao>[] = [
    { titulo: 'Vencimento', valor: (t) => formatarData(t.dataVencimento), largura: '110px' },
    {
      titulo: 'Descrição',
      valor: (t) => (
        <div className="financeiro-descricao">
          <strong>{titulo(t)}</strong>
          <span>
            {t.movimentos[0]?.descricao}
            {t.movimentos.length > 1 && ` + ${pluralizar(t.movimentos.length - 1, 'item', 'itens')}`}
          </span>
        </div>
      ),
    },
    {
      titulo: 'Tipo',
      valor: (t) => (t.tipo === 'RECEITA' ? 'Receita' : 'Despesa'),
      largura: '90px',
    },
    {
      titulo: 'Valor',
      valor: (t) =>
        t.tipo === 'RECEITA' ? (
          formatarMoeda(t.valorTotal)
        ) : (
          <span className="financeiro-despesa">− {formatarMoeda(t.valorTotal)}</span>
        ),
      alinhar: 'direita',
      largura: '130px',
    },
    {
      titulo: 'Situação',
      valor: (t) => {
        const s = situacoes[situacao(t)]
        return <Etiqueta cor={s.cor}>{s.rotulo}</Etiqueta>
      },
      largura: '120px',
    },
  ]

  /** Ações próprias da API (pagamento, cancelamento): executa e recarrega a lista. */
  async function executar(promessa: Promise<unknown>) {
    await promessa
    await transacoes.recarregar()
  }

  /** Nova receita ou despesa; o salvar do hook já recarrega a lista. */
  async function lancar(dados: DadosTransacao) {
    await transacoes.salvar(dados)
  }

  async function gerarMensalidades(competencia: string) {
    const criadas = await transacoesApi.gerarMensalidades(competencia)
    await transacoes.recarregar()
    const mes = formatarCompetencia(competencia)
    if (criadas > 0) toast.sucesso(`${pluralizar(criadas, 'mensalidade gerada', 'mensalidades geradas')} para ${mes}.`)
    else toast.info(`Nenhuma mensalidade nova para ${mes}: todas já foram geradas.`)
  }

  const erro = transacoes.erro ?? pessoas.erro ?? categorias.erro ?? formas.erro ?? servicos.erro
  const carregando = transacoes.carregando || pessoas.carregando || categorias.carregando || formas.carregando

  return (
    <>
      <CabecalhoPagina
        titulo="Financeiro"
        descricao="Contas a receber e a pagar."
        acoes={
          <>
            <Botao variante="secundario" onClick={() => setAcao({ tipo: 'mensalidades' })}>
              Gerar mensalidades
            </Botao>
            <Botao variante="secundario" onClick={() => setAcao({ tipo: 'despesa' })}>
              Nova despesa
            </Botao>
            <Botao onClick={() => setAcao({ tipo: 'receita' })}>Nova receita</Botao>
          </>
        }
      />

      {erro && <Alerta tipo="erro">{erro}</Alerta>}

      <ResumoFinanceiro transacoes={transacoes.itens} hoje={hoje} />

      <BarraFiltros>
        <CampoBusca valor={busca} onChange={setBusca} placeholder="Buscar por pessoa, categoria ou item" />
        <Selecao
          aria-label="Filtrar por tipo"
          placeholder="Receitas e despesas"
          opcoes={opcoesTipo}
          value={tipoFiltro}
          onChange={(e) => setTipoFiltro(e.target.value as TipoTransacao | '')}
        />
        <Selecao
          aria-label="Filtrar por situação"
          placeholder="Todas as situações"
          opcoes={opcoesSituacao}
          value={situacaoFiltro}
          onChange={(e) => setSituacaoFiltro(e.target.value as FiltroSituacao)}
        />
        <Entrada
          type="month"
          aria-label="Mês de vencimento"
          title="Mês de vencimento (vazio = todos)"
          value={mesFiltro}
          onChange={(e) => setMesFiltro(e.target.value)}
        />
      </BarraFiltros>

      <Tabela
        colunas={colunas}
        itens={filtradas}
        carregando={carregando}
        vazio={transacoes.itens.length ? 'Nenhuma transação corresponde aos filtros.' : 'Nenhuma transação lançada.'}
        acoes={(t) => (
          <>
            <Botao variante="fantasma" pequeno onClick={() => setAcao({ tipo: 'detalhe', transacao: t })}>
              Detalhes
            </Botao>
            {t.status === 'ABERTA' && (
              <>
                <Botao variante="fantasma" pequeno onClick={() => setAcao({ tipo: 'pagamento', transacao: t })}>
                  {t.tipo === 'RECEITA' ? 'Receber' : 'Pagar'}
                </Botao>
                <Botao variante="fantasma" pequeno onClick={() => setAcao({ tipo: 'cancelamento', transacao: t })}>
                  Cancelar
                </Botao>
              </>
            )}
          </>
        )}
      />

      {acao?.tipo === 'detalhe' && (
        <DetalheTransacao
          transacao={acao.transacao}
          titulo={titulo(acao.transacao)}
          formaPagamento={nomeForma.get(acao.transacao.formaPagamentoId ?? 0)}
          onFechar={() => setAcao(null)}
        />
      )}
      {acao?.tipo === 'pagamento' && (
        <ModalPagamento
          transacao={acao.transacao}
          formas={formas.itens}
          onSalvar={(pagamento) => executar(transacoesApi.registrarPagamento(acao.transacao.id, pagamento))}
          onFechar={() => setAcao(null)}
        />
      )}
      {acao?.tipo === 'cancelamento' && (
        <ModalCancelamento
          transacao={acao.transacao}
          onSalvar={(motivo) => executar(transacoesApi.cancelar(acao.transacao.id, motivo))}
          onFechar={() => setAcao(null)}
        />
      )}
      {acao?.tipo === 'receita' && (
        <ModalReceita
          pessoas={pessoas.itens}
          servicos={servicos.itens}
          onSalvar={lancar}
          onFechar={() => setAcao(null)}
        />
      )}
      {acao?.tipo === 'despesa' && (
        <ModalDespesa
          categorias={categorias.itens}
          pessoas={pessoas.itens}
          onSalvar={lancar}
          onFechar={() => setAcao(null)}
        />
      )}
      {acao?.tipo === 'mensalidades' && (
        <ModalMensalidades onGerar={gerarMensalidades} onFechar={() => setAcao(null)} />
      )}
    </>
  )
}
