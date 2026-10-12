import { useMemo, useState } from 'react'
import {
  Alerta,
  AreaTexto,
  BarraFiltros,
  Botao,
  CabecalhoPagina,
  CaixaSelecao,
  Campo,
  CampoBusca,
  Entrada,
  Etiqueta,
  EtiquetaSituacao,
  GrupoCampos,
  LinhaCampos,
  ModalFormulario,
  Selecao,
  Tabela,
  type Coluna,
} from '../components'
import { useEdicao } from '../hooks/useEdicao'
import { useRecurso } from '../hooks/useRecurso'
import { pessoasApi, type DadosPessoa } from '../services'
import type { Nivel, Pessoa } from '../types/models'
import { omitir } from '../utils/objeto'
import { niveis, opcoesNivel } from '../utils/rotulos'
import { contemTermo } from '../utils/texto'

type Papel = 'todos' | 'alunos' | 'professores' | 'clientes'

const opcoesPapel: { valor: Papel; rotulo: string }[] = [
  { valor: 'todos', rotulo: 'Todos os papéis' },
  { valor: 'alunos', rotulo: 'Alunos' },
  { valor: 'professores', rotulo: 'Professores' },
  { valor: 'clientes', rotulo: 'Só clientes' },
]

function temPapel(p: Pessoa, papel: Papel) {
  switch (papel) {
    case 'todos':
      return true
    case 'alunos':
      return p.aluno
    case 'professores':
      return p.professor
    case 'clientes':
      return !p.aluno && !p.professor
  }
}

function Papeis({ pessoa }: { pessoa: Pessoa }) {
  if (!pessoa.aluno && !pessoa.professor) return <Etiqueta>Cliente</Etiqueta>
  return (
    <>
      {pessoa.aluno && <Etiqueta cor="azul">Aluno</Etiqueta>}{' '}
      {pessoa.professor && <Etiqueta cor="amarelo">Professor</Etiqueta>}
    </>
  )
}

const colunas: Coluna<Pessoa>[] = [
  { titulo: 'Nome', valor: (p) => p.nome },
  { titulo: 'Papéis', valor: (p) => <Papeis pessoa={p} />, largura: '200px' },
  { titulo: 'Nível', valor: (p) => (p.nivel ? niveis[p.nivel] : '—'), largura: '140px' },
  { titulo: 'Telefone', valor: (p) => p.telefone ?? '—', largura: '160px' },
  { titulo: 'E-mail', valor: (p) => p.email ?? '—' },
  {
    titulo: 'Situação',
    valor: (p) => <EtiquetaSituacao ativo={p.ativo} feminino />,
    largura: '110px',
  },
]

type Situacao = 'todas' | 'ativas' | 'inativas'

const opcoesSituacao: { valor: Situacao; rotulo: string }[] = [
  { valor: 'todas', rotulo: 'Todas as situações' },
  { valor: 'ativas', rotulo: 'Ativas' },
  { valor: 'inativas', rotulo: 'Inativas' },
]

const vazio: DadosPessoa = { nome: '', aluno: true, professor: false, ativo: true }

const paraFormulario = (p: Pessoa): DadosPessoa => omitir(p, 'id', 'dataCadastro')

/** Campos opcionais: texto vazio vira undefined para não gravar "". */
const opcional = (valor: string) => valor || undefined

export default function Pessoas() {
  const pessoas = useRecurso(pessoasApi)
  const edicao = useEdicao(vazio, paraFormulario)

  const [busca, setBusca] = useState('')
  const [papel, setPapel] = useState<Papel>('todos')
  const [situacao, setSituacao] = useState<Situacao>('todas')

  const filtradas = useMemo(
    () =>
      pessoas.itens.filter(
        (p) =>
          contemTermo(busca, p.nome, p.email, p.telefone, p.cpf) &&
          temPapel(p, papel) &&
          (situacao === 'todas' || p.ativo === (situacao === 'ativas')),
      ),
    [pessoas.itens, busca, papel, situacao],
  )

  const { valores, alterar } = edicao

  function alterarAluno(aluno: boolean) {
    alterar('aluno', aluno)
    // nível só faz sentido para aluno
    if (!aluno) alterar('nivel', undefined)
  }

  return (
    <>
      <CabecalhoPagina
        titulo="Pessoas"
        descricao="Alunos, professores e clientes."
        acoes={<Botao onClick={edicao.abrirNovo}>Nova pessoa</Botao>}
      />

      {pessoas.erro && <Alerta tipo="erro">{pessoas.erro}</Alerta>}

      <BarraFiltros>
        <CampoBusca valor={busca} onChange={setBusca} placeholder="Buscar por nome, e-mail, telefone ou CPF" />
        <Selecao
          aria-label="Filtrar por papel"
          opcoes={opcoesPapel}
          value={papel}
          onChange={(e) => setPapel(e.target.value as Papel)}
        />
        <Selecao
          aria-label="Filtrar por situação"
          opcoes={opcoesSituacao}
          value={situacao}
          onChange={(e) => setSituacao(e.target.value as Situacao)}
        />
      </BarraFiltros>

      <Tabela
        colunas={colunas}
        itens={filtradas}
        carregando={pessoas.carregando}
        vazio={pessoas.itens.length ? 'Nenhuma pessoa corresponde aos filtros.' : 'Nenhuma pessoa cadastrada.'}
        acoes={(p) => (
          <Botao variante="fantasma" pequeno onClick={() => edicao.abrirEdicao(p)}>
            Editar
          </Botao>
        )}
      />

      <ModalFormulario
        aberto={edicao.aberto}
        titulo={edicao.editando ? 'Editar pessoa' : 'Nova pessoa'}
        onFechar={edicao.fechar}
        mensagemSucesso={edicao.editando ? 'Pessoa atualizada.' : 'Pessoa cadastrada.'}
        onSalvar={async () => {
          await pessoas.salvar(valores, edicao.editando?.id)
        }}
      >
        <Campo rotulo="Nome" obrigatorio>
          <Entrada value={valores.nome} onChange={(e) => alterar('nome', e.target.value)} required autoFocus />
        </Campo>
        <GrupoCampos rotulo="Papéis">
          <LinhaCampos>
            <CaixaSelecao rotulo="Aluno" checked={valores.aluno} onChange={(e) => alterarAluno(e.target.checked)} />
            <CaixaSelecao
              rotulo="Professor"
              checked={valores.professor}
              onChange={(e) => alterar('professor', e.target.checked)}
            />
          </LinhaCampos>
        </GrupoCampos>
        {valores.aluno && (
          <Campo rotulo="Nível">
            <Selecao
              placeholder="Não informado"
              opcoes={opcoesNivel}
              value={valores.nivel ?? ''}
              onChange={(e) => alterar('nivel', (e.target.value || undefined) as Nivel | undefined)}
            />
          </Campo>
        )}
        <LinhaCampos>
          <Campo rotulo="Telefone">
            <Entrada
              type="tel"
              value={valores.telefone ?? ''}
              onChange={(e) => alterar('telefone', opcional(e.target.value))}
            />
          </Campo>
          <Campo rotulo="E-mail">
            <Entrada
              type="email"
              value={valores.email ?? ''}
              onChange={(e) => alterar('email', opcional(e.target.value))}
            />
          </Campo>
        </LinhaCampos>
        <LinhaCampos>
          <Campo rotulo="CPF">
            <Entrada value={valores.cpf ?? ''} onChange={(e) => alterar('cpf', opcional(e.target.value))} />
          </Campo>
          <Campo rotulo="Data de nascimento">
            <Entrada
              type="date"
              value={valores.dataNascimento ?? ''}
              onChange={(e) => alterar('dataNascimento', opcional(e.target.value))}
            />
          </Campo>
        </LinhaCampos>
        <Campo rotulo="Observação">
          <AreaTexto
            value={valores.observacao ?? ''}
            onChange={(e) => alterar('observacao', opcional(e.target.value))}
          />
        </Campo>
        <CaixaSelecao rotulo="Ativa" checked={valores.ativo} onChange={(e) => alterar('ativo', e.target.checked)} />
      </ModalFormulario>
    </>
  )
}
