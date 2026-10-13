import { NavLink, Outlet } from 'react-router-dom'
import './AdminLayout.css'

const menu = [
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

export default function AdminLayout() {
  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand">QuadraLivre</div>
        <nav>
          {menu.map((item) => (
            <NavLink key={item.to} to={item.to} className="nav-link">
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
