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
} from '../components'
import { useEdicao } from '../hooks/useEdicao'
import { useRecurso } from '../hooks/useRecurso'
import { modalidadesApi, type Dados } from '../services'
import type { Modalidade } from '../types/models'

const vazio: Dados<Modalidade> = { nome: '', cor: '#6b7280', ativo: true }

const colunas: Coluna<Modalidade>[] = [
  { titulo: 'Nome', valor: (m) => m.nome },
  {
    titulo: 'Cor na agenda',
    valor: (m) => <span className="amostra-cor" style={{ background: m.cor }} title={m.cor} />,
    largura: '130px',
  },
  {
    titulo: 'Situação',
    valor: (m) => <EtiquetaSituacao ativo={m.ativo} feminino />,
    largura: '120px',
  },
]

/** Sem exclusão: planos, turmas e aulas apontam para a modalidade. */
export default function Modalidades() {
  const { itens, carregando, erro, salvar } = useRecurso(modalidadesApi)
  const edicao = useEdicao<Modalidade, Dados<Modalidade>>(vazio)

  return (
    <>
      <CabecalhoPagina
        titulo="Modalidades"
        descricao="Atividades oferecidas: tênis, treino físico…"
        acoes={<Botao onClick={edicao.abrirNovo}>Nova modalidade</Botao>}
      />

      {erro && <Alerta tipo="erro">{erro}</Alerta>}

      <Tabela
        colunas={colunas}
        itens={itens}
        carregando={carregando}
        vazio="Nenhuma modalidade cadastrada."
        acoes={(m) => (
          <Botao variante="fantasma" pequeno onClick={() => edicao.abrirEdicao(m)}>
            Editar
          </Botao>
        )}
      />

      <ModalFormulario
        aberto={edicao.aberto}
        titulo={edicao.editando ? 'Editar modalidade' : 'Nova modalidade'}
        onFechar={edicao.fechar}
        mensagemSucesso={edicao.editando ? 'Modalidade atualizada.' : 'Modalidade cadastrada.'}
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
        <Campo rotulo="Cor na agenda" ajuda="Aulas e turmas desta modalidade aparecem nesta cor.">
          <Entrada
            type="color"
            className="controle-cor"
            value={edicao.valores.cor}
            onChange={(e) => edicao.alterar('cor', e.target.value)}
          />
        </Campo>
        <CaixaSelecao
          rotulo="Ativa (disponível para novos planos e turmas)"
          checked={edicao.valores.ativo}
          onChange={(e) => edicao.alterar('ativo', e.target.checked)}
        />
      </ModalFormulario>
    </>
  )
}
