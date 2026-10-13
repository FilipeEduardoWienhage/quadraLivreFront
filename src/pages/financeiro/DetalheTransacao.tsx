import { Botao, Campo, Entrada, LinhaCampos, Modal, Tabela, type Coluna } from '../../components'
import type { Movimento, Transacao } from '../../types/models'
import { formatarData, formatarMoeda } from '../../utils/formatar'

const colunas: Coluna<Movimento>[] = [
  { titulo: 'Item', valor: (m) => m.descricao },
  { titulo: 'Qtd.', valor: (m) => m.quantidade, alinhar: 'direita', largura: '70px' },
  { titulo: 'Unitário', valor: (m) => formatarMoeda(m.valorUnitario), alinhar: 'direita', largura: '120px' },
  { titulo: 'Total', valor: (m) => formatarMoeda(m.valorTotal), alinhar: 'direita', largura: '120px' },
]

interface Props {
  transacao: Transacao
  /** pessoa ou categoria, já resolvida pela página */
  titulo: string
  formaPagamento?: string
  /** receita: quanto já foi registrado para devolução */
  devolvido?: number
  onFechar: () => void
}

export default function DetalheTransacao({ transacao, titulo, formaPagamento, devolvido, onFechar }: Props) {
  return (
    <Modal
      aberto
      titulo={titulo}
      largura="grande"
      onFechar={onFechar}
      rodape={
        <Botao variante="secundario" onClick={onFechar}>
          Fechar
        </Botao>
      }
    >
      <div className="formulario">
        <LinhaCampos>
          <Campo rotulo="Vencimento">
            <Entrada value={formatarData(transacao.dataVencimento)} readOnly />
          </Campo>
          <Campo rotulo="Valor total">
            <Entrada value={formatarMoeda(transacao.valorTotal)} readOnly />
          </Campo>
          {transacao.dataPagamento && (
            <Campo rotulo="Pagamento">
              <Entrada value={`${formatarData(transacao.dataPagamento)} — ${formaPagamento ?? ''}`} readOnly />
            </Campo>
          )}
          {devolvido !== undefined && devolvido > 0 && (
            <Campo rotulo="Devolvido">
              <Entrada value={formatarMoeda(devolvido)} readOnly />
            </Campo>
          )}
        </LinhaCampos>
        {transacao.observacao && (
          <Campo rotulo="Observação">
            <Entrada value={transacao.observacao} readOnly />
          </Campo>
        )}
        <Tabela colunas={colunas} itens={transacao.movimentos} />
      </div>
    </Modal>
  )
}
