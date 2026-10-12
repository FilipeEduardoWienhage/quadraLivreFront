import { useMemo, useState } from 'react'
import {
  Alerta,
  BarraFiltros,
  Botao,
  CabecalhoPagina,
  CaixaSelecao,
  Campo,
  Entrada,
  Etiqueta,
  EtiquetaSituacao,
  LinhaCampos,
  ModalFormulario,
  Selecao,
  Tabela,
  type Coluna,
} from '../components'
import { useEdicao } from '../hooks/useEdicao'
import { useRecurso } from '../hooks/useRecurso'
import { modalidadesApi, planosApi, type Dados } from '../services'
import type { Plano, TipoPlano } from '../types/models'
import { paraOpcao } from '../utils/opcoes'
import { descreverAulas, descreverValor, tiposPlano } from '../utils/rotulos'

const opcoesTipo = Object.entries(tiposPlano).map(([valor, rotulo]) => ({ valor, rotulo }))

const vazio: Dados<Plano> = {
  modalidadeId: 0,
  nome: '',
  tipo: 'MENSAL',
  qtdAulas: 1,
  valor: 0,
  ativo: true,
}

/** Validade sugerida ao escolher PACOTE. */
const VALIDADE_PADRAO = 30

const colunasFixas: Coluna<Plano>[] = [
  {
    titulo: 'Tipo',
    valor: (p) => <Etiqueta cor={p.tipo === 'PACOTE' ? 'azul' : 'amarelo'}>{tiposPlano[p.tipo]}</Etiqueta>,
    largura: '110px',
  },
  { titulo: 'Aulas', valor: (p) => descreverAulas(p.tipo, p.qtdAulas), largura: '140px' },
  { titulo: 'Validade', valor: (p) => (p.validadeDias ? `${p.validadeDias} dias` : '—'), largura: '110px' },
  {
    titulo: 'Valor',
    valor: (p) => descreverValor(p.tipo, p.valor),
    alinhar: 'direita',
    largura: '150px',
  },
  {
    titulo: 'Situação',
    valor: (p) => <EtiquetaSituacao ativo={p.ativo} />,
    largura: '110px',
  },
]

export default function Planos() {
  const planos = useRecurso(planosApi)
  const modalidades = useRecurso(modalidadesApi)
  const edicao = useEdicao<Plano, Dados<Plano>>(vazio)
  const { valores, alterar } = edicao
  const pacote = valores.tipo === 'PACOTE'
  const [modalidadeFiltro, setModalidadeFiltro] = useState('')

  const colunas = useMemo<Coluna<Plano>[]>(() => {
    const nomeModalidade = new Map(modalidades.itens.map((m) => [m.id, m.nome]))
    return [
      { titulo: 'Nome', valor: (p) => p.nome },
      { titulo: 'Modalidade', valor: (p) => nomeModalidade.get(p.modalidadeId) ?? '—', largura: '150px' },
      ...colunasFixas,
    ]
  }, [modalidades.itens])

  const filtrados = modalidadeFiltro
    ? planos.itens.filter((p) => p.modalidadeId === Number(modalidadeFiltro))
    : planos.itens

  const opcoesFiltro = modalidades.itens.map(paraOpcao)
  // inativas saem das opções, exceto a já escolhida, para não sumir ao editar um plano antigo
  const opcoesModalidade = modalidades.itens
    .filter((m) => m.ativo || m.id === valores.modalidadeId)
    .map(paraOpcao)

  function alterarTipo(tipo: TipoPlano) {
    alterar('tipo', tipo)
    // validade só existe em pacote; mensal dura enquanto o contrato estiver ativo
    alterar('validadeDias', tipo === 'PACOTE' ? VALIDADE_PADRAO : undefined)
  }

  const erro = planos.erro ?? modalidades.erro

  return (
    <>
      <CabecalhoPagina
        titulo="Planos"
        descricao="Pacotes de aulas e mensalidades vendidos aos alunos."
        acoes={<Botao onClick={edicao.abrirNovo}>Novo plano</Botao>}
      />

      {erro && <Alerta tipo="erro">{erro}</Alerta>}

      <BarraFiltros>
        <Selecao
          aria-label="Filtrar por modalidade"
          placeholder="Todas as modalidades"
          opcoes={opcoesFiltro}
          value={modalidadeFiltro}
          onChange={(e) => setModalidadeFiltro(e.target.value)}
        />
      </BarraFiltros>

      <Tabela
        colunas={colunas}
        itens={filtrados}
        carregando={planos.carregando || modalidades.carregando}
        vazio={planos.itens.length ? 'Nenhum plano nesta modalidade.' : 'Nenhum plano cadastrado.'}
        acoes={(p) => (
          <Botao variante="fantasma" pequeno onClick={() => edicao.abrirEdicao(p)}>
            Editar
          </Botao>
        )}
      />

      <ModalFormulario
        aberto={edicao.aberto}
        titulo={edicao.editando ? 'Editar plano' : 'Novo plano'}
        onFechar={edicao.fechar}
        mensagemSucesso={edicao.editando ? 'Plano atualizado.' : 'Plano cadastrado.'}
        onSalvar={async () => {
          await planos.salvar(valores, edicao.editando?.id)
        }}
      >
        <Campo rotulo="Nome" obrigatorio>
          <Entrada
            value={valores.nome}
            onChange={(e) => alterar('nome', e.target.value)}
            placeholder={pacote ? 'Ex.: Pacote 10 aulas tênis' : 'Ex.: Tênis 2x por semana'}
            required
            autoFocus
          />
        </Campo>
        <Campo rotulo="Modalidade" obrigatorio>
          <Selecao
            placeholder="Selecione…"
            opcoes={opcoesModalidade}
            value={valores.modalidadeId || ''}
            onChange={(e) => alterar('modalidadeId', Number(e.target.value))}
            required
          />
        </Campo>
        <LinhaCampos>
          <Campo rotulo="Tipo" obrigatorio>
            <Selecao
              opcoes={opcoesTipo}
              value={valores.tipo}
              onChange={(e) => alterarTipo(e.target.value as TipoPlano)}
            />
          </Campo>
          <Campo rotulo={pacote ? 'Total de aulas' : 'Aulas por semana'} obrigatorio>
            <Entrada
              type="number"
              min={1}
              max={pacote ? undefined : 7}
              step={1}
              value={valores.qtdAulas}
              onChange={(e) => alterar('qtdAulas', Number(e.target.value))}
              required
            />
          </Campo>
        </LinhaCampos>
        <LinhaCampos>
          {pacote && (
            <Campo rotulo="Validade (dias)" ajuda="Prazo para usar as aulas a partir da compra." obrigatorio>
              <Entrada
                type="number"
                min={1}
                step={1}
                value={valores.validadeDias ?? ''}
                onChange={(e) => alterar('validadeDias', e.target.value ? Number(e.target.value) : undefined)}
                required
              />
            </Campo>
          )}
          <Campo
            rotulo={pacote ? 'Valor do pacote (R$)' : 'Mensalidade (R$)'}
            ajuda="Alterar não afeta contratos já vendidos."
            obrigatorio
          >
            <Entrada
              type="number"
              min={0}
              step={0.01}
              value={valores.valor}
              onChange={(e) => alterar('valor', Number(e.target.value))}
              required
            />
          </Campo>
        </LinhaCampos>
        <CaixaSelecao
          rotulo="Ativo (disponível para novos contratos)"
          checked={valores.ativo}
          onChange={(e) => alterar('ativo', e.target.checked)}
        />
      </ModalFormulario>
    </>
  )
}
