import { useCallback, useEffect, useRef, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import './AdminLayout.css'

const menu = [
  { to: '/', label: 'Painel' },
  { to: '/agenda', label: 'Agenda' },
  { to: '/pessoas', label: 'Pessoas' },
  { to: '/turmas', label: 'Turmas' },
  { to: '/planos', label: 'Planos' },
  { to: '/contratos', label: 'Contratos' },
  { to: '/quadras', label: 'Quadras' },
  { to: '/espacos', label: 'Espaços' },
  { to: '/modalidades', label: 'Modalidades' },
  { to: '/servicos', label: 'Serviços' },
  { to: '/financeiro', label: 'Financeiro' },
  { to: '/configuracoes', label: 'Configurações' },
]

/**
 * Menu lateral fixo em telas largas; em celular e tablet vira uma barra no topo
 * com botão que abre o menu por cima do conteúdo.
 */
export default function AdminLayout() {
  const [menuAberto, setMenuAberto] = useState(false)
  const botaoAbrir = useRef<HTMLButtonElement>(null)
  const botaoFechar = useRef<HTMLButtonElement>(null)

  /** Fecha pelo ✕, pelo fundo ou pelo Esc: o foco volta para o ☰, de onde o menu foi aberto. */
  const fechar = useCallback(() => {
    setMenuAberto(false)
    botaoAbrir.current?.focus()
  }, [])

  useEffect(() => {
    if (!menuAberto) return
    // ao abrir, o foco vai para dentro do menu (quem usa teclado ou leitor de tela começa por ali)
    botaoFechar.current?.focus()
    const fecharComEsc = (e: KeyboardEvent) => e.key === 'Escape' && fechar()
    document.addEventListener('keydown', fecharComEsc)
    return () => document.removeEventListener('keydown', fecharComEsc)
  }, [menuAberto, fechar])

  return (
    <div className="layout">
      <header className="topo">
        <button
          ref={botaoAbrir}
          type="button"
          className="topo-botao"
          aria-label="Abrir menu"
          aria-expanded={menuAberto}
          aria-controls="menu-principal"
          onClick={() => setMenuAberto(true)}
        >
          <span aria-hidden="true">☰</span>
        </button>
        <span className="brand">QuadraLivre</span>
      </header>

      {menuAberto && <div className="menu-fundo" onClick={fechar} aria-hidden="true" />}

      <aside className={`sidebar${menuAberto ? ' aberto' : ''}`} id="menu-principal">
        <div className="sidebar-cabecalho">
          <div className="brand">QuadraLivre</div>
          <button ref={botaoFechar} type="button" className="topo-botao sidebar-fechar" aria-label="Fechar menu" onClick={fechar}>
            <span aria-hidden="true">✕</span>
          </button>
        </div>
        <nav aria-label="Menu principal">
          {menu.map((item) => (
            <NavLink key={item.to} to={item.to} end className="nav-link" onClick={() => setMenuAberto(false)}>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="content">
        <Outlet />
      </main>
    </div>
  )
}
