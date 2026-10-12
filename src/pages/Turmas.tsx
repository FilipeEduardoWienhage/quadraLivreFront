import { useMemo, useState } from 'react'
import {
  Alerta,
  Botao,
  CabecalhoPagina,
  CaixaSelecao,
  Campo,
  EditorHorarios,
  Entrada,
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
import { espacosApi, modalidadesApi, pessoasApi, turmasAlunosApi, turmasApi, type Dados } from '../services'
import type { Id, Nivel, Turma } from '../types/models'
import { formatarHorarios, validarHorarios } from '../utils/horarios'
import { paraOpcao } from '../utils/opcoes'
import { niveis, opcoesNivel } from '../utils/rotulos'
import TurmaAlunos from './TurmaAlunos'

const vazio: Dados<Turma> = {
  nome: '',
  modalidadeId: 0,
  professorId: 0,
  espacoId: 0,
  capacidade: 6,
  ativo: true,
  horarios: [{ diaSemana: 1, horaInicio: '18:00', horaFim: '19:00' }],
}

export default function Turmas() {
  const turmas = useRecurso(turmasApi)
  const pessoas = useRecurso(pessoasApi)
  const espacos = useRecurso(espacosApi)
  const modalidades = useRecurso(modalidadesApi)
  const matriculas = useRecurso(turmasAlunosApi)
  const edicao = useEdicao<Turma, Dados<Turma>>(vazio)
  const [turmaAlunos, setTurmaAlunos] = useState<Turma | null>(null)
  const { valores, alterar } = edicao

  /** alunos ativos por turma */
  const ocupacao = useMemo(() => {
    const contagem = new Map<Id, number>()
    for (const m of matriculas.itens) {
      if (!m.dataSaida) contagem.set(m.turmaId, (contagem.get(m.turmaId) ?? 0) + 1)
    }
    return contagem
  }, [matriculas.itens])

  const colunas = useMemo<Coluna<Turma>[]>(() => {
    const nomePessoa = new Map(pessoas.itens.map((p) => [p.id, p.nome]))
    const nomeEspaco = new Map(espacos.itens.map((e) => [e.id, e.nome]))
    const nomeModalidade = new Map(modalidades.itens.map((m) => [m.id, m.nome]))
    return [
      { titulo: 'Nome', valor: (t) => t.nome },
      { titulo: 'Modalidade', valor: (t) => nomeModalidade.get(t.modalidadeId) ?? '—', largura: '130px' },
      { titulo: 'Professor', valor: (t) => nomePessoa.get(t.professorId) ?? '—' },
      { titulo: 'Local', valor: (t) => nomeEspaco.get(t.espacoId) ?? '—', largura: '130px' },
      { titulo: 'Horários', valor: (t) => formatarHorarios(t.horarios) },
      { titulo: 'Nível', valor: (t) => (t.nivel ? niveis[t.nivel] : '—'), largura: '130px' },
      {
        titulo: 'Alunos',
        valor: (t) => `${ocupacao.get(t.id) ?? 0}/${t.capacidade}`,
        alinhar: 'centro',
        largura: '80px',
      },
      {
        titulo: 'Situação',
        valor: (t) => <EtiquetaSituacao ativo={t.ativo} feminino />,
        largura: '110px',
      },
    ]
  }, [pessoas.itens, espacos.itens, modalidades.itens, ocupacao])

  // inativos saem das opções, exceto o já escolhido, para não sumir ao editar uma turma antiga
  const opcoesProfessor = pessoas.itens
    .filter((p) => (p.ativo && p.professor) || p.id === valores.professorId)
    .map(paraOpcao)

  const opcoesEspaco = espacos.itens
    .filter((e) => e.status === 'ATIVO' || e.id === valores.espacoId)
    .map(paraOpcao)

  const opcoesModalidade = modalidades.itens
    .filter((m) => m.ativo || m.id === valores.modalidadeId)
    .map(paraOpcao)

  async function salvarTurma() {
    const erroHorarios = validarHorarios(valores.horarios)
    if (erroHorarios) throw new Error(erroHorarios)

    const alunos = edicao.editando ? (ocupacao.get(edicao.editando.id) ?? 0) : 0
    if (valores.capacidade < alunos) {
      throw new Error(`A turma tem ${alunos} alunos; a capacidade não pode ser menor que isso.`)
    }

    await turmas.salvar(valores, edicao.editando?.id)
  }

  const erro = turmas.erro ?? pessoas.erro ?? espacos.erro ?? modalidades.erro ?? matriculas.erro
  const carregando =
    turmas.carregando || pessoas.carregando || espacos.carregando || modalidades.carregando || matriculas.carregando

  return (
    <>
      <CabecalhoPagina
        titulo="Turmas"
        descricao="Aulas em grupo com horário fixo semanal."
        acoes={<Botao onClick={edicao.abrirNovo}>Nova turma</Botao>}
      />

      {erro && <Alerta tipo="erro">{erro}</Alerta>}

      <Tabela
        colunas={colunas}
        itens={turmas.itens}
        carregando={carregando}
        vazio="Nenhuma turma cadastrada."
        acoes={(t) => (
          <>
            <Botao variante="fantasma" pequeno onClick={() => setTurmaAlunos(t)}>
              Alunos
            </Botao>
            <Botao variante="fantasma" pequeno onClick={() => edicao.abrirEdicao(t)}>
              Editar
            </Botao>
          </>
        )}
      />

      <ModalFormulario
        aberto={edicao.aberto}
        titulo={edicao.editando ? 'Editar turma' : 'Nova turma'}
        onFechar={edicao.fechar}
        mensagemSucesso={edicao.editando ? 'Turma atualizada.' : 'Turma cadastrada.'}
        onSalvar={salvarTurma}
        largura="grande"
      >
        <Campo rotulo="Nome" obrigatorio>
          <Entrada
            value={valores.nome}
            onChange={(e) => alterar('nome', e.target.value)}
            placeholder="Ex.: Intermediário ter/qui 19h"
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
          <Campo rotulo="Professor" obrigatorio>
            <Selecao
              placeholder="Selecione…"
              opcoes={opcoesProfessor}
              value={valores.professorId || ''}
              onChange={(e) => alterar('professorId', Number(e.target.value))}
              required
            />
          </Campo>
          <Campo rotulo="Local" ajuda="Quadra ou outro espaço." obrigatorio>
            <Selecao
              placeholder="Selecione…"
              opcoes={opcoesEspaco}
              value={valores.espacoId || ''}
              onChange={(e) => alterar('espacoId', Number(e.target.value))}
              required
            />
          </Campo>
        </LinhaCampos>
        <LinhaCampos>
          <Campo rotulo="Nível">
            <Selecao
              placeholder="Livre"
              opcoes={opcoesNivel}
              value={valores.nivel ?? ''}
              onChange={(e) => alterar('nivel', (e.target.value || undefined) as Nivel | undefined)}
            />
          </Campo>
          <Campo rotulo="Capacidade (alunos)" obrigatorio>
            <Entrada
              type="number"
              min={1}
              step={1}
              value={valores.capacidade}
              onChange={(e) => alterar('capacidade', Number(e.target.value))}
              required
            />
          </Campo>
        </LinhaCampos>
        <GrupoCampos rotulo="Horários semanais">
          <EditorHorarios
            horarios={valores.horarios}
            onChange={(h) => alterar('horarios', h)}
            novo={vazio.horarios[0]}
          />
        </GrupoCampos>
        <CaixaSelecao rotulo="Ativa" checked={valores.ativo} onChange={(e) => alterar('ativo', e.target.checked)} />
      </ModalFormulario>

      {turmaAlunos && (
        <TurmaAlunos
          turma={turmaAlunos}
          matriculas={matriculas.itens}
          pessoas={pessoas.itens}
          onSalvarMatricula={matriculas.salvar}
          onFechar={() => setTurmaAlunos(null)}
        />
      )}
    </>
  )
}
