import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Campo, Entrada, LinhaCampos, ModalFormulario, Selecao } from '../../components'
import type { DadosTransacao } from '../../services'
import type { CategoriaDespesa, Pessoa } from '../../types/models'
import { hojeIso } from '../../utils/data'
import { paraOpcao } from '../../utils/opcoes'

interface Props {
  categorias: CategoriaDespesa[]
  pessoas: Pessoa[]
  onSalvar: (dados: DadosTransacao) => Promise<void>
  onFechar: () => void
}

/** Conta a pagar: uma descrição e um valor, classificada por categoria. */
export default function ModalDespesa({ categorias, pessoas, onSalvar, onFechar }: Props) {
  const [categoriaId, setCategoriaId] = useState('')
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState(0)
  const [dataVencimento, setDataVencimento] = useState(hojeIso())
  const [pessoaId, setPessoaId] = useState('')

  return (
    <ModalFormulario
      aberto
      titulo="Nova despesa"
      textoSalvar="Lançar despesa"
      mensagemSucesso="Despesa lançada."
      onFechar={onFechar}
      onSalvar={() =>
        onSalvar({
          tipo: 'DESPESA',
          categoriaId: Number(categoriaId),
          pessoaId: pessoaId ? Number(pessoaId) : undefined,
          dataVencimento,
          movimentos: [{ descricao: descricao.trim(), quantidade: 1, valorUnitario: valor }],
        })
      }
    >
      <Campo rotulo="Descrição" obrigatorio>
        <Entrada
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          placeholder="Ex.: Conta de energia — 10/2026"
          required
          autoFocus
        />
      </Campo>
      <LinhaCampos>
        <Campo rotulo="Categoria" ajuda={<Link to="/categorias-despesa">Gerenciar categorias</Link>} obrigatorio>
          <Selecao
            placeholder="Selecione…"
            opcoes={categorias.filter((c) => c.ativo).map(paraOpcao)}
            value={categoriaId}
            onChange={(e) => setCategoriaId(e.target.value)}
            required
          />
        </Campo>
        <Campo rotulo="Favorecido" ajuda="Opcional. Ex.: o professor, num repasse.">
          <Selecao
            placeholder="Nenhum"
            opcoes={pessoas.filter((p) => p.ativo).map(paraOpcao)}
            value={pessoaId}
            onChange={(e) => setPessoaId(e.target.value)}
          />
        </Campo>
      </LinhaCampos>
      <LinhaCampos>
        <Campo rotulo="Valor (R$)" obrigatorio>
          <Entrada
            type="number"
            min={0.01}
            step={0.01}
            value={valor || ''}
            onChange={(e) => setValor(Number(e.target.value))}
            required
          />
        </Campo>
        <Campo rotulo="Vencimento" obrigatorio>
          <Entrada type="date" value={dataVencimento} onChange={(e) => setDataVencimento(e.target.value)} required />
        </Campo>
      </LinhaCampos>
    </ModalFormulario>
  )
}
