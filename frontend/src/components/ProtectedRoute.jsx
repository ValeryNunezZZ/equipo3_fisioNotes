import { Navigate, Outlet } from 'react-router-dom';

const ProtectedRoute = ({ rolRequerido }) => {
  const token = localStorage.getItem('token');
  const userRol = localStorage.getItem('rol');

  // Si no hay token, lo mandamos de regreso al Login
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // Si la ruta exige un rol específico y el usuario no lo tiene, lo bloqueamos
  if (rolRequerido && userRol !== rolRequerido) {
    return <Navigate to="/login" replace />; 
  }

  // Si pasa las pruebas, mostramos la pantalla que solicitó (Outlet representa las rutas hijas)
  return <Outlet />;
};

export default ProtectedRoute;