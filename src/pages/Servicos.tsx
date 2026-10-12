import { useState } from 'react'
import {
  Alerta,
  Botao,
  CabecalhoPagina,
  CaixaSelecao,
  Campo,
  DialogoConfirmacao,
  Entrada,
  EtiquetaSituacao,
  ModalFormulario,
  Tabela,
  type Coluna,
} from '../components'
import { useEdicao } from '../hooks/useEdicao'
import { useRecurso } from '../hooks/useRecurso'
import { servicosApi, type Dados } from '../services'
import type { Servico } from '../types/models'
import { formatarMoeda } from '../utils/formatar'

const vazio: Dados<Servico> = { nome: '', valor: 0, ativo: true }

const colunas: Coluna<Servico>[] = [
  { titulo: 'Nome', valor: (s) => s.nome },
  { titulo: 'Valor', valor: (s) => formatarMoeda(s.valor), alinhar: 'direita', largura: '140px' },
  {
    titulo: 'Situação',
    valor: (s) => <EtiquetaSituacao ativo={s.ativo} />,
    largura: '120px',
  },
]

export default function Servicos() {
  const { itens, carregando, erro, salvar, excluir } = useRecurso(servicosApi)
  const edicao = useEdicao<Servico, Dados<Servico>>(vazio)
  const [excluindo, setExcluindo] = useState<Servico | null>(null)

  return (
    <>
      <CabecalhoPagina
        titulo="Serviços"
        descricao="Itens avulsos cobráveis: locação, aula avulsa, aluguel de material…"
        acoes={<Botao onClick={edicao.abrirNovo}>Novo serviço</Botao>}
      />

      {erro && <Alerta tipo="erro">{erro}</Alerta>}

      <Tabela
        colunas={colunas}
        itens={itens}
        carregando={carregando}
        vazio="Nenhum serviço cadastrado."
        acoes={(s) => (
          <>
            <Botao variante="fantasma" pequeno onClick={() => edicao.abrirEdicao(s)}>
              Editar
            </Botao>
            <Botao variante="fantasma" pequeno onClick={() => setExcluindo(s)}>
              Excluir
            </Botao>
          </>
        )}
      />

      <ModalFormulario
        aberto={edicao.aberto}
        titulo={edicao.editando ? 'Editar serviço' : 'Novo serviço'}
        onFechar={edicao.fechar}
        mensagemSucesso={edicao.editando ? 'Serviço atualizado.' : 'Serviço cadastrado.'}
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
        <Campo rotulo="Valor (R$)" obrigatorio>
          <Entrada
            type="number"
            min={0}
            step={0.01}
            value={edicao.valores.valor}
            onChange={(e) => edicao.alterar('valor', Number(e.target.value))}
            required
          />
        </Campo>
        <CaixaSelecao
          rotulo="Ativo"
          checked={edicao.valores.ativo}
          onChange={(e) => edicao.alterar('ativo', e.target.checked)}
        />
      </ModalFormulario>

      <DialogoConfirmacao
        aberto={excluindo !== null}
        titulo="Excluir serviço"
        mensagem={`Excluir "${excluindo?.nome}"? Essa ação não pode ser desfeita.`}
        textoConfirmar="Excluir"
        mensagemSucesso="Serviço excluído."
        perigo
        onCancelar={() => setExcluindo(null)}
        onConfirmar={async () => {
          if (excluindo) await excluir(excluindo.id)
        }}
      />
    </>
  )
}
