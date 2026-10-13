import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Botao } from '../../components'
import type { ResumoPainel } from '../../services'
import type { Id, Transacao } from '../../types/models'
import { diasEntre } from '../../utils/data'
import { formatarCompetencia, formatarData, formatarMoeda, pluralizar } from '../../utils/formatar'
import { descrever, hora, type Nomes } from '../agenda/descricao'

/** Itens mostrados por grupo; o resto fica na tela própria ("e mais N"). */
const LIMITE_POR_GRUPO = 3

interface Props {
  resumo: ResumoPainel
  hoje: string
  nomes: Nomes
  nomePlano: Map<Id, string>
  /** baixa de uma cobrança vencida ou de uma devolução */
  onPagar: (transacao: Transacao) => void
  onGerarMensalidades: () => Promise<void>
}

interface Linha {
  chave: string | number
  principal: ReactNode
  detalhe: ReactNode
  acao: ReactNode
}

interface Grupo {
  titulo: string
  /** tela com a lista completa, para o "e mais N" */
  destino: string
  linhas: Linha[]
}

/** Pendências do dia a dia, cada uma com a ação que a resolve. */
export default function Pendencias({ resumo, hoje, nomes, nomePlano, onPagar, onGerarMensalidades }: Props) {
  const [gerando, setGerando] = useState(false)
  const pessoa = (id?: Id) => nomes.pessoa.get(id ?? 0) ?? '—'

  async function gerar() {
    setGerando(true)
    try {
      await onGerarMensalidades()
    } finally {
      setGerando(false)
    }
  }

  const botaoPagar = (t: Transacao, texto: string) => (
    <Botao variante="fantasma" pequeno onClick={() => onPagar(t)}>
      {texto}
    </Botao>
  )

  const grupos: Grupo[] = [
    {
      titulo: 'Cobranças vencidas',
      destino: '/financeiro',
      linhas: resumo.cobrancasVencidas.map((t) => {
        const dias = diasEntre(t.dataVencimento, hoje)
        return {
          chave: t.id,
          principal: pessoa(t.pessoaId),
          detalhe: `${formatarMoeda(t.valorTotal)} · ${t.movimentos[0]?.descricao} · venceu há ${pluralizar(dias, 'dia', 'dias')}`,
          acao: botaoPagar(t, 'Receber'),
        }
      }),
    },
    {
      titulo: 'Presença não registrada',
      destino: '/agenda',
      linhas: resumo.presencasPendentes.map((a) => ({
        chave: a.id,
        principal: descrever(a, nomes).titulo,
        detalhe: `${formatarData(a.dataInicio)} ${hora(a.dataInicio)} · ${nomes.espaco.get(a.espacoId)} · ${descrever(a, nomes).subtitulo}`,
        acao: (
          <Link
            to={`/agenda?data=${a.dataInicio.slice(0, 10)}&agendamento=${a.id}`}
            className="botao botao-fantasma botao-pequeno"
          >
            Registrar
          </Link>
        ),
      })),
    },
    {
      titulo: 'Pacotes terminando',
      destino: '/contratos',
      linhas: resumo.pacotesTerminando.map((p) => ({
        chave: `${p.contratoId}-${p.planoId}`,
        principal: pessoa(p.alunoId),
        detalhe: `${nomePlano.get(p.planoId)} · ${pluralizar(p.restantes, 'aula restante', 'aulas restantes')} · vence em ${formatarData(p.validade)}`,
        acao: (
          <Link to="/contratos" className="botao botao-fantasma botao-pequeno">
            Contratos
          </Link>
        ),
      })),
    },
    {
      titulo: 'Devoluções a pagar',
      destino: '/financeiro',
      linhas: resumo.devolucoesEmAberto.map((t) => ({
        chave: t.id,
        principal: pessoa(t.pessoaId),
        detalhe: `${formatarMoeda(t.valorTotal)} · até ${formatarData(t.dataVencimento)} · ${t.observacao}`,
        acao: botaoPagar(t, 'Pagar'),
      })),
    },
  ]

  const visiveis = grupos.filter((g) => g.linhas.length)
  const mesAtual = hoje.slice(0, 7)

  return (
    <section className="painel-inicial-bloco" aria-labelledby="painel-pendencias-titulo">
      <header className="painel-inicial-bloco-cabecalho">
        <h2 id="painel-pendencias-titulo">Precisa de atenção</h2>
      </header>

      {visiveis.length === 0 && resumo.mensalidadesNaoGeradas === 0 && (
        <p className="painel-inicial-vazio">Tudo em dia: nenhuma pendência.</p>
      )}

      {resumo.mensalidadesNaoGeradas > 0 && (
        <div className="painel-inicial-pendencia painel-inicial-pendencia-destaque">
          <span>
            <strong>Mensalidades de {formatarCompetencia(mesAtual)} não geradas</strong>
            <span>{pluralizar(resumo.mensalidadesNaoGeradas, 'contrato sem cobrança', 'contratos sem cobrança')}</span>
          </span>
          <Botao pequeno carregando={gerando} onClick={gerar}>
            Gerar
          </Botao>
        </div>
      )}

      {visiveis.map((grupo) => (
        <GrupoPendencias key={grupo.titulo} {...grupo} />
      ))}
    </section>
  )
}

function GrupoPendencias({ titulo, destino, linhas }: Grupo) {
  const resto = linhas.length - LIMITE_POR_GRUPO
  return (
    <div className="painel-inicial-grupo">
      <h3 className="painel-inicial-subtitulo">
        {titulo} <span className="painel-inicial-contagem">{linhas.length}</span>
      </h3>
      <ul className="painel-inicial-lista">
        {linhas.slice(0, LIMITE_POR_GRUPO).map(({ chave, principal, detalhe, acao }) => (
          <li key={chave} className="painel-inicial-pendencia">
            <span>
              <strong>{principal}</strong>
              <span>{detalhe}</span>
            </span>
            {acao}
          </li>
        ))}
      </ul>
      {resto > 0 && (
        <Link to={destino} className="painel-inicial-mais">
          e mais {resto}
        </Link>
      )}
    </div>
  )
}
