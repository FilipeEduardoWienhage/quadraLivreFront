import { useState } from 'react'
import { Botao, Campo, Entrada, GrupoCampos, LinhaCampos, ModalFormulario, Selecao } from '../../components'
import type { DadosMovimento, DadosTransacao } from '../../services'
import type { Pessoa, Servico } from '../../types/models'
import { hojeIso } from '../../utils/data'
import { arredondarMoeda, formatarMoeda } from '../../utils/formatar'
import { paraOpcao } from '../../utils/opcoes'
import './Financeiro.css'

interface Props {
  pessoas: Pessoa[]
  servicos: Servico[]
  onSalvar: (dados: DadosTransacao) => Promise<void>
  onFechar: () => void
}

/** Cobrança avulsa de serviços (aluguel de raquete, aula avulsa…). */
export default function ModalReceita({ pessoas, servicos, onSalvar, onFechar }: Props) {
  const [pessoaId, setPessoaId] = useState('')
  const [dataVencimento, setDataVencimento] = useState(hojeIso())
  const [itens, setItens] = useState<DadosMovimento[]>([])

  function incluir(servicoId: number) {
    const servico = servicos.find((s) => s.id === servicoId)
    if (servico) {
      setItens([...itens, { servicoId, descricao: servico.nome, quantidade: 1, valorUnitario: servico.valor }])
    }
  }

  function alterar(indice: number, mudanca: Partial<DadosMovimento>) {
    setItens(itens.map((item, i) => (i === indice ? { ...item, ...mudanca } : item)))
  }

  const total = arredondarMoeda(itens.reduce((soma, i) => soma + i.quantidade * i.valorUnitario, 0))

  return (
    <ModalFormulario
      aberto
      titulo="Nova receita"
      textoSalvar="Lançar cobrança"
      mensagemSucesso="Cobrança lançada."
      largura="grande"
      onFechar={onFechar}
      onSalvar={() => {
        if (itens.length === 0) throw new Error('Inclua ao menos um serviço.')
        return onSalvar({ tipo: 'RECEITA', pessoaId: Number(pessoaId), dataVencimento, movimentos: itens })
      }}
    >
      <LinhaCampos>
        <Campo rotulo="Quem paga" obrigatorio>
          <Selecao
            placeholder="Selecione…"
            opcoes={pessoas.filter((p) => p.ativo).map(paraOpcao)}
            value={pessoaId}
            onChange={(e) => setPessoaId(e.target.value)}
            required
            autoFocus
          />
        </Campo>
        <Campo rotulo="Vencimento" obrigatorio>
          <Entrada type="date" value={dataVencimento} onChange={(e) => setDataVencimento(e.target.value)} required />
        </Campo>
      </LinhaCampos>

      <GrupoCampos rotulo="Itens" ajuda="Quantidade e valor unitário podem ser ajustados.">
        <div className="financeiro-itens">
          {itens.map((item, i) => (
            // itens sem id e sem estado interno: o índice basta como key
            <div className="financeiro-item" key={i}>
              <span className="financeiro-item-descricao">{item.descricao}</span>
              <Entrada
                type="number"
                aria-label="Quantidade"
                title="Quantidade"
                min={1}
                step={1}
                value={item.quantidade}
                onChange={(e) => alterar(i, { quantidade: Number(e.target.value) })}
                required
              />
              <Entrada
                type="number"
                aria-label="Valor unitário (R$)"
                title="Valor unitário (R$)"
                min={0}
                step={0.01}
                value={item.valorUnitario}
                onChange={(e) => alterar(i, { valorUnitario: Number(e.target.value) })}
                required
              />
              <Botao variante="fantasma" pequeno onClick={() => setItens(itens.filter((_, j) => j !== i))}>
                Remover
              </Botao>
            </div>
          ))}
          <div className="financeiro-itens-rodape">
            <Selecao
              aria-label="Incluir serviço"
              placeholder="Incluir serviço…"
              opcoes={servicos.filter((s) => s.ativo).map((s) => ({ valor: s.id, rotulo: `${s.nome} — ${formatarMoeda(s.valor)}` }))}
              value=""
              onChange={(e) => e.target.value && incluir(Number(e.target.value))}
            />
            <strong>Total: {formatarMoeda(total)}</strong>
          </div>
        </div>
      </GrupoCampos>
    </ModalFormulario>
  )
}
