import { useState } from 'react'
import { Campo, Entrada, LinhaCampos, ModalFormulario, Selecao } from '../components'
import type { Finalizacao } from '../services'
import type { CobrancaFinal, Contrato } from '../types/models'
import { diasCobrados, totalContrato } from '../utils/contrato'
import { hojeIso } from '../utils/data'
import { arredondarMoeda, formatarCompetencia, formatarMoeda } from '../utils/formatar'

interface Props {
  contrato: Contrato
  status: Finalizacao['status']
  nomeAluno: string
  onConfirmar: (finalizacao: Finalizacao) => Promise<void>
  onFechar: () => void
}

/**
 * Encerrar (término normal) ou cancelar (desistência). Mensal escolhe como cobrar o último mês:
 * integral, ou um valor definido pelo gestor, sugerido pelos dias usados.
 */
export default function ModalFinalizarContrato({ contrato, status, nomeAluno, onConfirmar, onFechar }: Props) {
  const cancelamento = status === 'CANCELADO'
  const mensal = contrato.tipo === 'MENSAL'

  // o fim é hoje (ou a data de fim original, se já passou) — como o servidor calcula
  const hoje = hojeIso()
  const fim = contrato.dataFim && contrato.dataFim < hoje ? contrato.dataFim : hoje
  const competencia = fim.slice(0, 7)
  const integral = totalContrato(contrato)
  const { dias, diasNoMes } = diasCobrados({ ...contrato, dataFim: fim, cobrancaFinal: 'PROPORCIONAL' }, competencia)
  const sugestao = arredondarMoeda((integral * dias) / diasNoMes)

  const [cobrancaFinal, setCobrancaFinal] = useState<CobrancaFinal | ''>('')
  const [valorFinal, setValorFinal] = useState(sugestao)
  const proporcional = cobrancaFinal === 'PROPORCIONAL'

  return (
    <ModalFormulario
      aberto
      titulo={cancelamento ? 'Cancelar contrato' : 'Encerrar contrato'}
      textoSalvar={cancelamento ? 'Cancelar contrato' : 'Encerrar contrato'}
      textoCancelar="Voltar"
      mensagemSucesso={cancelamento ? 'Contrato cancelado.' : 'Contrato encerrado.'}
      largura="pequena"
      onFechar={onFechar}
      onSalvar={() =>
        onConfirmar({
          status,
          cobrancaFinal: mensal ? (cobrancaFinal as CobrancaFinal) : undefined,
          valorFinal: proporcional ? valorFinal : undefined,
        })
      }
    >
      <p className="modal-texto">
        {cancelamento
          ? `Cancelar o contrato de ${nomeAluno}? Use para desistência do aluno.`
          : `Encerrar o contrato de ${nomeAluno}? Use quando o contrato terminou normalmente.`}
      </p>
      {mensal && (
        <Campo
          rotulo={`Cobrança do último mês (${formatarCompetencia(competencia)})`}
          ajuda="Se a mensalidade do mês já foi gerada e está em aberto, ela é ajustada. Mensalidades em aberto de meses seguintes são canceladas."
          obrigatorio
        >
          <Selecao
            placeholder="Selecione…"
            opcoes={[
              { valor: 'INTEGRAL', rotulo: `Mês integral (${formatarMoeda(integral)})` },
              { valor: 'PROPORCIONAL', rotulo: 'Proporcional' },
            ]}
            value={cobrancaFinal}
            onChange={(e) => setCobrancaFinal(e.target.value as CobrancaFinal | '')}
            required
          />
        </Campo>
      )}
      {proporcional && (
        <LinhaCampos>
          <Campo rotulo="Valor integral do mês">
            <Entrada value={formatarMoeda(integral)} readOnly />
          </Campo>
          <Campo
            rotulo="Valor a cobrar (R$)"
            ajuda={`Sugestão: ${formatarMoeda(sugestao)} (${dias} de ${diasNoMes} dias).`}
            obrigatorio
          >
            <Entrada
              type="number"
              min={0.01}
              max={integral}
              step={0.01}
              value={valorFinal || ''}
              onChange={(e) => setValorFinal(Number(e.target.value))}
              required
            />
          </Campo>
        </LinhaCampos>
      )}
    </ModalFormulario>
  )
}
