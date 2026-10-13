import { useState } from 'react'
import {
  Alerta,
  Botao,
  CaixaSelecao,
  Campo,
  DialogoConfirmacao,
  Entrada,
  Etiqueta,
  LinhaCampos,
  ModalFormulario,
  Tabela,
  type Coluna,
} from '../../components'
import { useEdicao } from '../../hooks/useEdicao'
import { useRecurso } from '../../hooks/useRecurso'
import { feriadosApi, type Dados } from '../../services'
import type { Feriado } from '../../types/models'
import { hojeIso } from '../../utils/data'
import { formatarData } from '../../utils/formatar'

/** Horário sugerido ao marcar que a academia abre no feriado. */
const HORARIO_ESPECIAL = { abertura: '08:00', fechamento: '14:00' }

const colunas: Coluna<Feriado>[] = [
  {
    titulo: 'Data',
    valor: (f) => (f.anual ? `${formatarData(f.data).slice(0, 5)} (todo ano)` : formatarData(f.data)),
    largura: '170px',
  },
  { titulo: 'Feriado', valor: (f) => f.nome },
  {
    titulo: 'Funcionamento',
    valor: (f) =>
      f.aberto ? (
        <Etiqueta cor="amarelo">{`Das ${f.abertura} às ${f.fechamento}`}</Etiqueta>
      ) : (
        <Etiqueta>Fechado</Etiqueta>
      ),
    largura: '170px',
  },
]

/** Ordem do calendário (mês e dia), independentemente do ano. */
const ordenar = (a: Feriado, b: Feriado) => a.data.slice(5).localeCompare(b.data.slice(5)) || a.data.localeCompare(b.data)

/** Datas em que o funcionamento foge da semana: fechado ou com horário especial. */
export default function Feriados() {
  const { itens, carregando, erro, salvar, excluir } = useRecurso(feriadosApi)
  const [vazio] = useState<Dados<Feriado>>(() => ({ data: hojeIso(), nome: '', anual: false, aberto: false }))
  const edicao = useEdicao<Feriado, Dados<Feriado>>(vazio)
  const { valores, alterar } = edicao
  const [excluindo, setExcluindo] = useState<Feriado | null>(null)

  function alterarAberto(aberto: boolean) {
    alterar('aberto', aberto)
    if (aberto && !valores.abertura) {
      alterar('abertura', HORARIO_ESPECIAL.abertura)
      alterar('fechamento', HORARIO_ESPECIAL.fechamento)
    }
  }

  async function salvarFeriado() {
    if (valores.aberto && (!valores.abertura || !valores.fechamento || valores.fechamento <= valores.abertura)) {
      throw new Error('Informe o horário especial: o fechamento deve ser depois da abertura.')
    }
    // fechado não tem horário; os campos ficam no formulário caso o gestor volte atrás antes de salvar
    const dados = valores.aberto ? valores : { ...valores, abertura: undefined, fechamento: undefined }
    await salvar(dados, edicao.editando?.id)
  }

  return (
    <>
      <div className="configuracoes-secao-acoes">
        <Botao onClick={edicao.abrirNovo}>Novo feriado</Botao>
      </div>

      {erro && <Alerta tipo="erro">{erro}</Alerta>}

      <Tabela
        colunas={colunas}
        itens={[...itens].sort(ordenar)}
        carregando={carregando}
        vazio="Nenhum feriado cadastrado."
        acoes={(f) => (
          <>
            <Botao variante="fantasma" pequeno onClick={() => edicao.abrirEdicao(f)}>
              Editar
            </Botao>
            <Botao variante="fantasma" pequeno onClick={() => setExcluindo(f)}>
              Excluir
            </Botao>
          </>
        )}
      />

      <ModalFormulario
        aberto={edicao.aberto}
        titulo={edicao.editando ? 'Editar feriado' : 'Novo feriado'}
        onFechar={edicao.fechar}
        mensagemSucesso={edicao.editando ? 'Feriado atualizado.' : 'Feriado cadastrado.'}
        onSalvar={salvarFeriado}
      >
        <LinhaCampos>
          <Campo rotulo="Nome" obrigatorio>
            <Entrada
              value={valores.nome}
              onChange={(e) => alterar('nome', e.target.value)}
              placeholder="Ex.: Natal"
              required
              autoFocus
            />
          </Campo>
          <Campo rotulo="Data" obrigatorio>
            <Entrada type="date" value={valores.data} onChange={(e) => alterar('data', e.target.value)} required />
          </Campo>
        </LinhaCampos>
        <CaixaSelecao
          rotulo="Repete todo ano nesta data (ex.: Natal, Tiradentes)"
          checked={valores.anual}
          onChange={(e) => alterar('anual', e.target.checked)}
        />
        <CaixaSelecao
          rotulo="A academia abre neste dia, com horário especial"
          checked={valores.aberto}
          onChange={(e) => alterarAberto(e.target.checked)}
        />
        {valores.aberto && (
          <LinhaCampos>
            <Campo rotulo="Abertura" obrigatorio>
              <Entrada
                type="time"
                value={valores.abertura ?? ''}
                onChange={(e) => alterar('abertura', e.target.value)}
                required
              />
            </Campo>
            <Campo rotulo="Fechamento" obrigatorio>
              <Entrada
                type="time"
                value={valores.fechamento ?? ''}
                onChange={(e) => alterar('fechamento', e.target.value)}
                required
              />
            </Campo>
          </LinhaCampos>
        )}
      </ModalFormulario>

      <DialogoConfirmacao
        aberto={excluindo !== null}
        titulo="Excluir feriado"
        mensagem={`Excluir "${excluindo?.nome}"? Nesse dia, volta a valer o horário normal da semana.`}
        textoConfirmar="Excluir"
        mensagemSucesso="Feriado excluído."
        perigo
        onCancelar={() => setExcluindo(null)}
        onConfirmar={async () => {
          if (excluindo) await excluir(excluindo.id)
        }}
      />
    </>
  )
}
