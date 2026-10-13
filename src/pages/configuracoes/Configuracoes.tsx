import { Alerta, CabecalhoPagina } from '../../components'
import { useConfiguracoes } from '../../hooks/useConfiguracoes'
import Feriados from './Feriados'
import HorarioSemana from './HorarioSemana'
import './Configuracoes.css'

export default function Configuracoes() {
  const { configuracoes, erro, salvar } = useConfiguracoes()

  return (
    <>
      <CabecalhoPagina titulo="Configurações" descricao="Como a academia funciona." />

      {erro && <Alerta tipo="erro">{erro}</Alerta>}

      <section className="configuracoes-secao" aria-labelledby="titulo-horario">
        <h2 id="titulo-horario">Horário de funcionamento</h2>
        <p className="configuracoes-secao-descricao">
          Limita a agenda: fora deste horário não é possível agendar. Feriados abaixo têm prioridade sobre ele.
        </p>
        {configuracoes ? (
          <HorarioSemana
            funcionamento={configuracoes.funcionamento}
            onSalvar={(funcionamento) => salvar({ ...configuracoes, funcionamento })}
          />
        ) : (
          <p className="configuracoes-secao-descricao">Carregando…</p>
        )}
      </section>

      <section className="configuracoes-secao" aria-labelledby="titulo-feriados">
        <h2 id="titulo-feriados">Feriados e datas especiais</h2>
        <p className="configuracoes-secao-descricao">
          Dias em que a academia fecha ou abre em horário especial. Encontros de turma não são gerados em dia fechado.
        </p>
        <Feriados />
      </section>
    </>
  )
}
