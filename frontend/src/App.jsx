import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import FisioDashboard from './pages/FisioDashboard';
import PacienteDashboard from './pages/PacienteDashboard';
import AdminDashboard from './pages/AdminDashboard';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* =========================================
            RUTAS PÚBLICAS
        ========================================= */}
        {/* Redirigir la raíz directamente al login */}
        <Route path="/" element={<Navigate to="/login" />} />
        
        <Route path="/login" element={<Login />} />

        {/* =========================================
            RUTAS PROTEGIDAS (Solo Administradores)
        ========================================= */}
        <Route element={<ProtectedRoute rolRequerido="ADMIN" />}>
          <Route path="/admin" element={<AdminDashboard />} />
        </Route>

        {/* =========================================
            RUTAS PROTEGIDAS (Solo Fisioterapeutas)
        ========================================= */}
        <Route element={<ProtectedRoute rolRequerido="FISIO" />}>
          <Route path="/fisio" element={<FisioDashboard />} />
        </Route>

        {/* =========================================
            RUTAS PROTEGIDAS (Solo Pacientes)
        ========================================= */}
        <Route element={<ProtectedRoute rolRequerido="PACIENTE" />}>
          <Route path="/paciente" element={<PacienteDashboard />} />
        </Route>

      </Routes>
    </BrowserRouter>
  );
}

export default App;