import { Botao, Entrada, Selecao, type Opcao } from '../components'
import type { DadosContratoItem } from '../services'
import type { Id, Plano, TipoPlano } from '../types/models'
import { formatarMoeda } from '../utils/formatar'
import { descreverAulas, descreverValor } from '../utils/rotulos'
import './ContratoItens.css'

interface Props {
  tipo: TipoPlano
  itens: DadosContratoItem[]
  planos: Map<Id, Plano>
  /** planos que ainda podem ser incluídos */
  opcoesPlano: Opcao<number>[]
  /** num ajuste, a quantidade de aulas também pode mudar */
  ajuste: boolean
  onChange: (itens: DadosContratoItem[]) => void
}

/** Planos de um contrato: inclusão, remoção e valores negociados por item. */
export default function ContratoItens({ tipo, itens, planos, opcoesPlano, ajuste, onChange }: Props) {
  function incluir(planoId: number) {
    const plano = planos.get(planoId)
    if (!plano) return
    // cópia dos valores do plano no momento da venda (ver contratos_itens em docs/modelagem.md)
    onChange([...itens, { planoId, qtdAulas: plano.qtdAulas, valor: plano.valor }])
  }

  function alterar(indice: number, mudanca: Partial<DadosContratoItem>) {
    onChange(itens.map((item, i) => (i === indice ? { ...item, ...mudanca } : item)))
  }

  const total = itens.reduce((soma, item) => soma + item.valor, 0)

  return (
    <div className="contrato-itens">
      {itens.map((item, i) => {
        const plano = planos.get(item.planoId)
        return (
          // um plano aparece no máximo uma vez por contrato: serve de key
          <div className="contrato-itens-linha" key={item.planoId}>
            <div className="contrato-itens-plano">
              <strong>{plano?.nome ?? '—'}</strong>
              <span>
                {descreverAulas(tipo, item.qtdAulas)}
                {plano && item.valor < plano.valor && ` · desconto de ${formatarMoeda(plano.valor - item.valor)}`}
              </span>
            </div>
            {ajuste && (
              <Entrada
                type="number"
                aria-label={tipo === 'PACOTE' ? 'Total de aulas' : 'Aulas por semana'}
                title={tipo === 'PACOTE' ? 'Total de aulas' : 'Aulas por semana'}
                min={1}
                max={tipo === 'PACOTE' ? undefined : 7}
                step={1}
                value={item.qtdAulas}
                onChange={(e) => alterar(i, { qtdAulas: Number(e.target.value) })}
                required
              />
            )}
            <Entrada
              type="number"
              aria-label="Valor (R$)"
              title="Valor (R$)"
              min={0}
              step={0.01}
              value={item.valor}
              onChange={(e) => alterar(i, { valor: Number(e.target.value) })}
              required
            />
            <Botao variante="fantasma" pequeno onClick={() => onChange(itens.filter((_, j) => j !== i))}>
              Remover
            </Botao>
          </div>
        )
      })}

      <div className="contrato-itens-rodape">
        <Selecao
          aria-label="Incluir plano"
          placeholder={opcoesPlano.length ? 'Incluir plano…' : 'Nenhum plano disponível'}
          opcoes={opcoesPlano}
          value=""
          onChange={(e) => e.target.value && incluir(Number(e.target.value))}
          disabled={opcoesPlano.length === 0}
        />
        <span className="contrato-itens-total">Total: {descreverValor(tipo, total)}</span>
      </div>
    </div>
  )
}
