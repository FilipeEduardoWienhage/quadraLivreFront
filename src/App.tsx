import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import AdminLayout from './layouts/AdminLayout'
import EmConstrucao from './pages/EmConstrucao'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<EmConstrucao titulo="Login" />} />
        <Route element={<AdminLayout />}>
          <Route index element={<Navigate to="/agenda" replace />} />
          <Route path="/agenda" element={<EmConstrucao titulo="Agenda" />} />
          <Route path="/pessoas" element={<EmConstrucao titulo="Pessoas" />} />
          <Route path="/turmas" element={<EmConstrucao titulo="Turmas" />} />
          <Route path="/planos" element={<EmConstrucao titulo="Planos" />} />
          <Route path="/contratos" element={<EmConstrucao titulo="Contratos" />} />
          <Route path="/quadras" element={<EmConstrucao titulo="Quadras" />} />
          <Route path="/servicos" element={<EmConstrucao titulo="Serviços" />} />
          <Route path="/financeiro" element={<EmConstrucao titulo="Financeiro" />} />
          <Route path="*" element={<EmConstrucao titulo="Página não encontrada" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
