import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ToastProvider } from './components'
import AdminLayout from './layouts/AdminLayout'
import Agenda from './pages/agenda/Agenda'
import Contratos from './pages/Contratos'
import EmConstrucao from './pages/EmConstrucao'
import Espacos from './pages/Espacos'
import CategoriasDespesa from './pages/financeiro/CategoriasDespesa'
import Financeiro from './pages/financeiro/Financeiro'
import Modalidades from './pages/Modalidades'
import Pessoas from './pages/Pessoas'
import Planos from './pages/Planos'
import Servicos from './pages/Servicos'
import Turmas from './pages/Turmas'

export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<EmConstrucao titulo="Login" />} />
          <Route element={<AdminLayout />}>
            <Route index element={<Navigate to="/agenda" replace />} />
            <Route path="/agenda" element={<Agenda />} />
            <Route path="/pessoas" element={<Pessoas />} />
            <Route path="/turmas" element={<Turmas />} />
            <Route path="/planos" element={<Planos />} />
            <Route path="/contratos" element={<Contratos />} />
            <Route path="/modalidades" element={<Modalidades />} />
            {/* mesmo componente nas duas rotas: a key evita reaproveitar o estado ao trocar de página */}
            <Route path="/quadras" element={<Espacos key="QUADRA" tipo="QUADRA" />} />
            <Route path="/espacos" element={<Espacos key="OUTRO" tipo="OUTRO" />} />
            <Route path="/servicos" element={<Servicos />} />
            <Route path="/financeiro" element={<Financeiro />} />
            <Route path="/categorias-despesa" element={<CategoriasDespesa />} />
            <Route path="*" element={<EmConstrucao titulo="Página não encontrada" />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  )
}
