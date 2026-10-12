import { Link } from 'react-router-dom'
import {
  Alerta,
  Botao,
  CabecalhoPagina,
  CaixaSelecao,
  Campo,
  Entrada,
  EtiquetaSituacao,
  ModalFormulario,
  Tabela,
  type Coluna,
} from '../../components'
import { useEdicao } from '../../hooks/useEdicao'
import { useRecurso } from '../../hooks/useRecurso'
import { categoriasDespesaApi, type Dados } from '../../services'
import type { CategoriaDespesa } from '../../types/models'

const vazio: Dados<CategoriaDespesa> = { nome: '', ativo: true }

const colunas: Coluna<CategoriaDespesa>[] = [
  { titulo: 'Nome', valor: (c) => c.nome },
  {
    titulo: 'Situação',
    valor: (c) => <EtiquetaSituacao ativo={c.ativo} feminino />,
    largura: '120px',
  },
]

/** Sem exclusão: despesas lançadas apontam para a categoria. */
export default function CategoriasDespesa() {
  const { itens, carregando, erro, salvar } = useRecurso(categoriasDespesaApi)
  const edicao = useEdicao<CategoriaDespesa, Dados<CategoriaDespesa>>(vazio)

  return (
    <>
      <CabecalhoPagina
        titulo="Categorias de despesa"
        descricao="Classificação das contas a pagar para os relatórios."
        acoes={
          <>
            <Link to="/financeiro" className="botao botao-secundario">
              Voltar ao financeiro
            </Link>
            <Botao onClick={edicao.abrirNovo}>Nova categoria</Botao>
          </>
        }
      />

      {erro && <Alerta tipo="erro">{erro}</Alerta>}

      <Tabela
        colunas={colunas}
        itens={itens}
        carregando={carregando}
        vazio="Nenhuma categoria cadastrada."
        acoes={(c) => (
          <Botao variante="fantasma" pequeno onClick={() => edicao.abrirEdicao(c)}>
            Editar
          </Botao>
        )}
      />

      <ModalFormulario
        aberto={edicao.aberto}
        titulo={edicao.editando ? 'Editar categoria' : 'Nova categoria'}
        onFechar={edicao.fechar}
        mensagemSucesso={edicao.editando ? 'Categoria atualizada.' : 'Categoria cadastrada.'}
        largura="pequena"
        onSalvar={async () => {
          await salvar(edicao.valores, edicao.editando?.id)
        }}
      >
        <Campo rotulo="Nome" obrigatorio>
          <Entrada
            value={edicao.valores.nome}
            onChange={(e) => edicao.alterar('nome', e.target.value)}
            required
            autoFocus
          />
        </Campo>
        <CaixaSelecao
          rotulo="Ativa (disponível para novas despesas)"
          checked={edicao.valores.ativo}
          onChange={(e) => edicao.alterar('ativo', e.target.checked)}
        />
      </ModalFormulario>
    </>
  )
}
