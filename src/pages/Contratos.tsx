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
  DialogoConfirmacao,
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
import { contratosApi, pessoasApi, planosApi, type DadosContrato } from '../services'
import type { Contrato, StatusContrato, TipoPlano } from '../types/models'
import { hojeIso, somarDias } from '../utils/data'
import { formatarData } from '../utils/formatar'
import { paraOpcao } from '../utils/opcoes'
import { descreverValor, tiposPlano } from '../utils/rotulos'
import { contemTermo } from '../utils/texto'
import ContratoItens from './ContratoItens'

const status: Record<StatusContrato, { rotulo: string; cor: CorEtiqueta }> = {
  ATIVO: { rotulo: 'Ativo', cor: 'verde' },
  ENCERRADO: { rotulo: 'Encerrado', cor: 'cinza' },
  CANCELADO: { rotulo: 'Cancelado', cor: 'vermelho' },
}

const opcoesStatus = Object.entries(status).map(([valor, s]) => ({ valor, rotulo: s.rotulo }))
const opcoesTipo = Object.entries(tiposPlano).map(([valor, rotulo]) => ({ valor, rotulo }))

/** Dia do mês que existe em todos os meses. */
const ULTIMO_DIA_VENCIMENTO = 28

const diaVencimentoPadrao = (dataInicio: string) =>
  Math.min(Number(dataInicio.slice(8, 10)), ULTIMO_DIA_VENCIMENTO)

function contratoVazio(): DadosContrato {
  const hoje = hojeIso()
  return { alunoId: 0, tipo: 'MENSAL', itens: [], dataInicio: hoje, diaVencimento: diaVencimentoPadrao(hoje), status: 'ATIVO' }
}

const totalContrato = (c: Pick<Contrato, 'itens'>) => c.itens.reduce((soma, item) => soma + item.valor, 0)

type Finalizacao = { contrato: Contrato; status: 'ENCERRADO' | 'CANCELADO' }

export default function Contratos() {
  const contratos = useRecurso(contratosApi)
  const pessoas = useRecurso(pessoasApi)
  const planos = useRecurso(planosApi)

  // calculado uma vez: a data de hoje entra no contrato vazio
  const [vazio] = useState(contratoVazio)
  const edicao = useEdicao<Contrato, DadosContrato>(vazio)
  const { valores, alterar } = edicao
  const editando = edicao.editando !== null

  const [busca, setBusca] = useState('')
  const [statusFiltro, setStatusFiltro] = useState<StatusContrato | ''>('ATIVO')
  const [finalizacao, setFinalizacao] = useState<Finalizacao | null>(null)

  const nomeAluno = useMemo(() => new Map(pessoas.itens.map((p) => [p.id, p.nome])), [pessoas.itens])
  const planoPorId = useMemo(() => new Map(planos.itens.map((p) => [p.id, p])), [planos.itens])

  const colunas = useMemo<Coluna<Contrato>[]>(
    () => [
      { titulo: 'Aluno', valor: (c) => nomeAluno.get(c.alunoId) ?? '—' },
      { titulo: 'Planos', valor: (c) => c.itens.map((i) => planoPorId.get(i.planoId)?.nome ?? '—').join(' + ') },
      { titulo: 'Tipo', valor: (c) => tiposPlano[c.tipo], largura: '90px' },
      { titulo: 'Início', valor: (c) => formatarData(c.dataInicio), largura: '110px' },
      { titulo: 'Fim', valor: (c) => (c.dataFim ? formatarData(c.dataFim) : '—'), largura: '110px' },
      { titulo: 'Valor', valor: (c) => descreverValor(c.tipo, totalContrato(c)), alinhar: 'direita', largura: '140px' },
      { titulo: 'Vencimento', valor: (c) => (c.diaVencimento ? `Dia ${c.diaVencimento}` : '—'), largura: '110px' },
      {
        titulo: 'Status',
        valor: (c) => <Etiqueta cor={status[c.status].cor}>{status[c.status].rotulo}</Etiqueta>,
        largura: '110px',
      },
    ],
    [nomeAluno, planoPorId],
  )

  const filtrados = useMemo(
    () =>
      contratos.itens.filter(
        (c) =>
          contemTermo(busca, nomeAluno.get(c.alunoId), ...c.itens.map((i) => planoPorId.get(i.planoId)?.nome)) &&
          (!statusFiltro || c.status === statusFiltro),
      ),
    [contratos.itens, busca, statusFiltro, nomeAluno, planoPorId],
  )

  // venda só para alunos ativos
  const opcoesAluno = pessoas.itens.filter((p) => p.ativo && p.aluno).map(paraOpcao)

  // um plano por modalidade: a cota de cada modalidade fica num item só
  const modalidadesNoContrato = new Set(valores.itens.map((i) => planoPorId.get(i.planoId)?.modalidadeId))
  const opcoesPlano = planos.itens
    .filter((p) => p.ativo && p.tipo === valores.tipo && !modalidadesNoContrato.has(p.modalidadeId))
    .map((p) => ({ valor: p.id, rotulo: `${p.nome} — ${descreverValor(p.tipo, p.valor)}` }))

  // na venda de pacote, o fim é derivado: início + maior validade entre os itens.
  // num ajuste, o fim é editado direto (ex.: estender a validade após um afastamento).
  const maiorValidade = Math.max(0, ...valores.itens.map((i) => planoPorId.get(i.planoId)?.validadeDias ?? 0))
  const dataFimVenda = valores.tipo === 'PACOTE' && maiorValidade ? somarDias(valores.dataInicio, maiorValidade) : undefined

  function alterarTipo(tipo: TipoPlano) {
    alterar('tipo', tipo)
    // itens precisam ser do mesmo tipo do contrato
    alterar('itens', [])
    alterar('diaVencimento', tipo === 'MENSAL' ? diaVencimentoPadrao(valores.dataInicio) : undefined)
  }

  async function salvarContrato() {
    if (valores.itens.length === 0) throw new Error('Inclua ao menos um plano.')

    if (!edicao.editando) {
      await contratos.salvar({ ...valores, dataFim: dataFimVenda })
      return
    }
    if (valores.dataFim && valores.dataFim < valores.dataInicio) {
      throw new Error('A data de fim não pode ser anterior ao início.')
    }
    await contratos.salvar(valores, edicao.editando.id)
  }

  async function finalizar() {
    if (!finalizacao) return
    await contratosApi.finalizar(finalizacao.contrato.id, finalizacao.status)
    await contratos.recarregar()
  }

  const nomeFinalizacao = finalizacao ? nomeAluno.get(finalizacao.contrato.alunoId) : ''
  const cancelamento = finalizacao?.status === 'CANCELADO'

  const erro = contratos.erro ?? pessoas.erro ?? planos.erro

  return (
    <>
      <CabecalhoPagina
        titulo="Contratos"
        descricao="Planos contratados pelos alunos. Um contrato pode combinar modalidades."
        acoes={<Botao onClick={edicao.abrirNovo}>Novo contrato</Botao>}
      />

      {erro && <Alerta tipo="erro">{erro}</Alerta>}

      <BarraFiltros>
        <CampoBusca valor={busca} onChange={setBusca} placeholder="Buscar por aluno ou plano" />
        <Selecao
          aria-label="Filtrar por status"
          placeholder="Todos os status"
          opcoes={opcoesStatus}
          value={statusFiltro}
          onChange={(e) => setStatusFiltro(e.target.value as StatusContrato | '')}
        />
      </BarraFiltros>

      <Tabela
        colunas={colunas}
        itens={filtrados}
        carregando={contratos.carregando || pessoas.carregando || planos.carregando}
        vazio={contratos.itens.length ? 'Nenhum contrato corresponde aos filtros.' : 'Nenhum contrato cadastrado.'}
        acoes={(c) =>
          c.status === 'ATIVO' && (
            <>
              <Botao variante="fantasma" pequeno onClick={() => edicao.abrirEdicao(c)}>
                Editar
              </Botao>
              <Botao variante="fantasma" pequeno onClick={() => setFinalizacao({ contrato: c, status: 'ENCERRADO' })}>
                Encerrar
              </Botao>
              <Botao variante="fantasma" pequeno onClick={() => setFinalizacao({ contrato: c, status: 'CANCELADO' })}>
                Cancelar
              </Botao>
            </>
          )
        }
      />

      <ModalFormulario
        aberto={edicao.aberto}
        titulo={editando ? 'Ajustar contrato' : 'Novo contrato'}
        textoSalvar={editando ? 'Salvar ajuste' : 'Registrar contrato'}
        onFechar={edicao.fechar}
        mensagemSucesso={editando ? 'Contrato ajustado.' : 'Contrato registrado.'}
        onSalvar={salvarContrato}
        largura="grande"
      >
        {editando ? (
          <LinhaCampos>
            <Campo rotulo="Aluno">
              <Entrada value={nomeAluno.get(valores.alunoId) ?? ''} readOnly />
            </Campo>
            <Campo rotulo="Tipo">
              <Entrada value={tiposPlano[valores.tipo]} readOnly />
            </Campo>
          </LinhaCampos>
        ) : (
          <LinhaCampos>
            <Campo rotulo="Aluno" obrigatorio>
              <Selecao
                placeholder="Selecione…"
                opcoes={opcoesAluno}
                value={valores.alunoId || ''}
                onChange={(e) => alterar('alunoId', Number(e.target.value))}
                required
                autoFocus
              />
            </Campo>
            <Campo rotulo="Tipo" ajuda="Mensal: cota semanal por modalidade. Pacote: total de aulas." obrigatorio>
              <Selecao
                opcoes={opcoesTipo}
                value={valores.tipo}
                onChange={(e) => alterarTipo(e.target.value as TipoPlano)}
              />
            </Campo>
          </LinhaCampos>
        )}

        <GrupoCampos rotulo="Planos">
          <ContratoItens
            tipo={valores.tipo}
            itens={valores.itens}
            planos={planoPorId}
            opcoesPlano={opcoesPlano}
            ajuste={editando}
            onChange={(itens) => alterar('itens', itens)}
          />
        </GrupoCampos>

        <LinhaCampos>
          <Campo rotulo="Início" obrigatorio>
            <Entrada
              type="date"
              value={valores.dataInicio}
              onChange={(e) => alterar('dataInicio', e.target.value)}
              required
            />
          </Campo>
          {valores.tipo === 'PACOTE' && editando && (
            <Campo rotulo="Válido até" ajuda="Estenda para compensar afastamentos." obrigatorio>
              <Entrada
                type="date"
                min={valores.dataInicio}
                value={valores.dataFim ?? ''}
                onChange={(e) => alterar('dataFim', e.target.value || undefined)}
                required
              />
            </Campo>
          )}
          {valores.tipo === 'PACOTE' && !editando && (
            <Campo rotulo="Válido até" ajuda="Início + maior validade entre os planos.">
              <Entrada value={dataFimVenda ? formatarData(dataFimVenda) : ''} readOnly />
            </Campo>
          )}
          {valores.tipo === 'MENSAL' && (
            <Campo rotulo="Dia do vencimento" ajuda={`De 1 a ${ULTIMO_DIA_VENCIMENTO}.`} obrigatorio>
              <Entrada
                type="number"
                min={1}
                max={ULTIMO_DIA_VENCIMENTO}
                step={1}
                value={valores.diaVencimento ?? ''}
                onChange={(e) => alterar('diaVencimento', e.target.value ? Number(e.target.value) : undefined)}
                required
              />
            </Campo>
          )}
        </LinhaCampos>

        {valores.tipo === 'MENSAL' && (
          <CaixaSelecao
            rotulo="1ª mensalidade proporcional aos dias restantes do mês de início"
            checked={valores.proporcional ?? false}
            onChange={(e) => alterar('proporcional', e.target.checked || undefined)}
          />
        )}

        <Campo rotulo="Observação" ajuda="Registre o motivo de ajustes: renegociação, cortesia, afastamento…">
          <AreaTexto
            value={valores.observacao ?? ''}
            onChange={(e) => alterar('observacao', e.target.value || undefined)}
          />
        </Campo>
      </ModalFormulario>

      <DialogoConfirmacao
        aberto={finalizacao !== null}
        titulo={cancelamento ? 'Cancelar contrato' : 'Encerrar contrato'}
        mensagem={
          cancelamento
            ? `Cancelar o contrato de ${nomeFinalizacao}? Use para desistência do aluno.`
            : `Encerrar o contrato de ${nomeFinalizacao}? Use quando o contrato terminou normalmente.`
        }
        textoConfirmar={cancelamento ? 'Cancelar contrato' : 'Encerrar contrato'}
        textoCancelar="Voltar"
        mensagemSucesso={cancelamento ? 'Contrato cancelado.' : 'Contrato encerrado.'}
        perigo={cancelamento}
        onCancelar={() => setFinalizacao(null)}
        onConfirmar={finalizar}
      />
    </>
  )
}
