import { useState } from 'react'
import {
  Alerta,
  Botao,
  CabecalhoPagina,
  Campo,
  DialogoConfirmacao,
  EditorHorarios,
  Entrada,
  Etiqueta,
  GrupoCampos,
  LinhaCampos,
  ModalFormulario,
  Selecao,
  Tabela,
  type Coluna,
  type CorEtiqueta,
} from '../components'
import { useEdicao } from '../hooks/useEdicao'
import { useRecurso } from '../hooks/useRecurso'
import { espacosApi, type Dados } from '../services'
import type { Espaco, FaixaPreco, FormaLocacao, StatusEspaco, TipoEspaco } from '../types/models'
import { formatarMoeda } from '../utils/formatar'
import { validarHorarios } from '../utils/horarios'

const formasLocacao: Record<FormaLocacao, string> = {
  NAO: 'Não alugável',
  POR_HORA: 'Por hora',
  POR_PERIODO: 'Por período',
}

const opcoesLocacao = Object.entries(formasLocacao).map(([valor, rotulo]) => ({ valor, rotulo }))

/** Primeira faixa de cada forma de locação. */
const novaFaixa: Record<Exclude<FormaLocacao, 'NAO'>, FaixaPreco> = {
  POR_HORA: { diaSemana: 1, horaInicio: '08:00', horaFim: '22:00', valor: 0 },
  POR_PERIODO: { diaSemana: 6, horaInicio: '11:00', horaFim: '16:00', valor: 0 },
}

/** Ex.: "R$ 80,00 a R$ 120,00/h", "R$ 200,00 por período". */
function resumirLocacao(e: Espaco) {
  if (e.locacao === 'NAO') return formasLocacao.NAO
  if (e.precos.length === 0) return 'Sem preço definido'
  const valores = e.precos.map((p) => p.valor)
  const [menor, maior] = [Math.min(...valores), Math.max(...valores)]
  const faixa = menor === maior ? formatarMoeda(menor) : `${formatarMoeda(menor)} a ${formatarMoeda(maior)}`
  return e.locacao === 'POR_HORA' ? `${faixa}/h` : `${faixa} por período`
}

// quadras e demais espaços ficam na mesma tabela (espacos), mas cada tipo tem sua página.
// textos por extenso porque "quadra" é feminino e "espaço" é masculino
interface Textos {
  titulo: string
  descricao: string
  novo: string
  editar: string
  excluir: string
  nenhum: string
  cadastrado: string
  atualizado: string
  excluido: string
  ativo: string
  inativo: string
}

const textos: Record<TipoEspaco, Textos> = {
  QUADRA: {
    titulo: 'Quadras',
    descricao: 'Quadras para locação e aulas.',
    novo: 'Nova quadra',
    editar: 'Editar quadra',
    excluir: 'Excluir quadra',
    nenhum: 'Nenhuma quadra cadastrada.',
    cadastrado: 'Quadra cadastrada.',
    atualizado: 'Quadra atualizada.',
    excluido: 'Quadra excluída.',
    ativo: 'Ativa',
    inativo: 'Inativa',
  },
  OUTRO: {
    titulo: 'Espaços',
    descricao: 'Sala de treino físico, churrasqueira, paredão e outros espaços que podem ser agendados.',
    novo: 'Novo espaço',
    editar: 'Editar espaço',
    excluir: 'Excluir espaço',
    nenhum: 'Nenhum espaço cadastrado.',
    cadastrado: 'Espaço cadastrado.',
    atualizado: 'Espaço atualizado.',
    excluido: 'Espaço excluído.',
    ativo: 'Ativo',
    inativo: 'Inativo',
  },
}

const vazios: Record<TipoEspaco, Dados<Espaco>> = {
  QUADRA: { nome: '', tipo: 'QUADRA', status: 'ATIVO', locacao: 'POR_HORA', precos: [] },
  OUTRO: { nome: '', tipo: 'OUTRO', status: 'ATIVO', locacao: 'NAO', precos: [] },
}

const coresStatus: Record<StatusEspaco, CorEtiqueta> = { ATIVO: 'verde', MANUTENCAO: 'amarelo', INATIVO: 'cinza' }

/** Cadastro de espaços de um tipo: usado pelas páginas Quadras e Espaços. */
export default function Espacos({ tipo }: { tipo: TipoEspaco }) {
  const { itens, carregando, erro, salvar, excluir } = useRecurso(espacosApi)
  const edicao = useEdicao<Espaco, Dados<Espaco>>(vazios[tipo])
  const [excluindo, setExcluindo] = useState<Espaco | null>(null)

  const t = textos[tipo]
  const rotuloStatus: Record<StatusEspaco, string> = { ATIVO: t.ativo, MANUTENCAO: 'Manutenção', INATIVO: t.inativo }
  const opcoesStatus = Object.entries(rotuloStatus).map(([valor, rotulo]) => ({ valor, rotulo }))
  const colunas: Coluna<Espaco>[] = [
    { titulo: 'Nome', valor: (e) => e.nome },
    { titulo: 'Locação', valor: resumirLocacao },
    {
      titulo: 'Status',
      valor: (e) => <Etiqueta cor={coresStatus[e.status]}>{rotuloStatus[e.status]}</Etiqueta>,
      largura: '160px',
    },
  ]
  const doTipo = itens.filter((e) => e.tipo === tipo)

  const { valores, alterar } = edicao
  const locacao = valores.locacao

  async function salvarEspaco() {
    if (locacao !== 'NAO') {
      if (valores.precos.length === 0) throw new Error('Informe ao menos uma faixa de preço.')
      const erroPrecos = validarHorarios(valores.precos)
      if (erroPrecos) throw new Error(erroPrecos)
    }
    // não alugável não tem preço; as faixas ficam no formulário caso a forma volte a mudar
    const dados = locacao === 'NAO' ? { ...valores, precos: [] } : valores
    await salvar(dados, edicao.editando?.id)
  }

  return (
    <>
      <CabecalhoPagina
        titulo={t.titulo}
        descricao={t.descricao}
        acoes={<Botao onClick={edicao.abrirNovo}>{t.novo}</Botao>}
      />

      {erro && <Alerta tipo="erro">{erro}</Alerta>}

      <Tabela
        colunas={colunas}
        itens={doTipo}
        carregando={carregando}
        vazio={t.nenhum}
        acoes={(e) => (
          <>
            <Botao variante="fantasma" pequeno onClick={() => edicao.abrirEdicao(e)}>
              Editar
            </Botao>
            <Botao variante="fantasma" pequeno onClick={() => setExcluindo(e)}>
              Excluir
            </Botao>
          </>
        )}
      />

      <ModalFormulario
        aberto={edicao.aberto}
        titulo={edicao.editando ? t.editar : t.novo}
        onFechar={edicao.fechar}
        mensagemSucesso={edicao.editando ? t.atualizado : t.cadastrado}
        largura={locacao === 'NAO' ? 'pequena' : 'grande'}
        onSalvar={salvarEspaco}
      >
        <Campo rotulo="Nome" obrigatorio>
          <Entrada value={valores.nome} onChange={(e) => alterar('nome', e.target.value)} required autoFocus />
        </Campo>
        <LinhaCampos>
          <Campo rotulo="Status" obrigatorio>
            <Selecao
              opcoes={opcoesStatus}
              value={valores.status}
              onChange={(e) => alterar('status', e.target.value as StatusEspaco)}
            />
          </Campo>
          <Campo rotulo="Locação" obrigatorio>
            <Selecao
              opcoes={opcoesLocacao}
              value={locacao}
              onChange={(e) => alterar('locacao', e.target.value as FormaLocacao)}
            />
          </Campo>
        </LinhaCampos>
        {locacao !== 'NAO' && (
          <GrupoCampos
            rotulo={locacao === 'POR_HORA' ? 'Preço por hora' : 'Períodos reserváveis'}
            ajuda={
              locacao === 'POR_HORA'
                ? 'Valor da hora em cada faixa. Uma reserva que atravesse faixas soma cada parte.'
                : 'Cada linha é um período que pode ser reservado inteiro, pelo valor informado.'
            }
          >
            <EditorHorarios<FaixaPreco>
              horarios={valores.precos}
              onChange={(precos) => alterar('precos', precos)}
              novo={novaFaixa[locacao]}
              textoAdicionar={locacao === 'POR_HORA' ? 'Adicionar faixa' : 'Adicionar período'}
              extra={(faixa, alterarFaixa) => (
                <Entrada
                  type="number"
                  aria-label="Valor (R$)"
                  title="Valor (R$)"
                  min={0}
                  step={0.01}
                  value={faixa.valor}
                  onChange={(e) => alterarFaixa({ valor: Number(e.target.value) })}
                  required
                />
              )}
            />
          </GrupoCampos>
        )}
      </ModalFormulario>

      <DialogoConfirmacao
        aberto={excluindo !== null}
        titulo={t.excluir}
        mensagem={`Excluir "${excluindo?.nome}"? Essa ação não pode ser desfeita.`}
        textoConfirmar="Excluir"
        mensagemSucesso={t.excluido}
        perigo
        onCancelar={() => setExcluindo(null)}
        onConfirmar={async () => {
          if (excluindo) await excluir(excluindo.id)
        }}
      />
    </>
  )
}
