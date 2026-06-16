import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function AdminDashboard() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ nombre: '', email: '', password: '', confirmPassword: '', cedula: '' });
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });

  const cerrarSesion = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('rol');
    navigate('/login');
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setMensaje({ texto: 'Las contraseñas no coinciden.', tipo: 'error' });
      return;
    }
    setMensaje({ texto: 'Registrando fisioterapeuta...', tipo: 'loading' });

    try {
      // Reutilizamos el endpoint seguro que ya habías creado en el backend
      await axios.post('http://localhost:3000/api/registro', {
        nombre: formData.nombre,
        email: formData.email,
        password: formData.password,
        cedula: formData.cedula
      });

      setMensaje({ texto: '¡Fisioterapeuta registrado con éxito!', tipo: 'success' });
      setFormData({ nombre: '', email: '', password: '', confirmPassword: '', cedula: '' }); // Limpiar formulario
      
      setTimeout(() => setMensaje({ texto: '', tipo: '' }), 3000);
    } catch (error) {
      setMensaje({ texto: error.response?.data?.error || 'Error al conectar con el servidor', tipo: 'error' });
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      {/* Panel Lateral */}
      <div style={{ width: '250px', backgroundColor: '#111827', color: 'white', padding: '20px', display: 'flex', flexDirection: 'column' }}>
        <h2>FisioNotes</h2>
        <p style={{ color: '#9CA3AF', fontSize: '14px' }}>Panel de Administrador</p>
        <nav style={{ marginTop: '30px', flexGrow: 1 }}>
          <a style={{ color: 'white', textDecoration: 'none', fontWeight: 'bold', display: 'block', padding: '8px', backgroundColor: '#374151', borderRadius: '4px' }}>
            🏥 Alta de Personal
          </a>
        </nav>
        <button onClick={cerrarSesion} style={{ padding: '10px', backgroundColor: '#EF4444', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Salir</button>
      </div>

      {/* Contenido Principal */}
      <div style={{ flexGrow: 1, padding: '40px', backgroundColor: '#F3F4F6' }}>
        <h1 style={{ color: '#1F2937', marginBottom: '20px' }}>Registrar Nuevo Fisioterapeuta</h1>
        
        <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', maxWidth: '500px' }}>
          {mensaje.texto && (
            <div style={{ padding: '10px', marginBottom: '20px', borderRadius: '6px', textAlign: 'center', backgroundColor: mensaje.tipo === 'error' ? '#FEE2E2' : '#D1FAE5', color: mensaje.tipo === 'error' ? '#991B1B' : '#065F46' }}>
              {mensaje.texto}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <input type="text" name="nombre" value={formData.nombre} onChange={handleChange} required placeholder="Nombre del Profesional (ej. Dr. Ruiz)" style={{ padding: '10px', border: '1px solid #D1D5DB', borderRadius: '6px' }} />
            <input type="text" name="cedula" value={formData.cedula} onChange={handleChange} required placeholder="Cédula Profesional" style={{ padding: '10px', border: '1px solid #D1D5DB', borderRadius: '6px' }} />
            <input type="email" name="email" value={formData.email} onChange={handleChange} required placeholder="Correo Electrónico" style={{ padding: '10px', border: '1px solid #D1D5DB', borderRadius: '6px' }} />
            <input type="password" name="password" value={formData.password} onChange={handleChange} required placeholder="Contraseña de acceso" style={{ padding: '10px', border: '1px solid #D1D5DB', borderRadius: '6px' }} />
            <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} required placeholder="Confirmar Contraseña" style={{ padding: '10px', border: '1px solid #D1D5DB', borderRadius: '6px' }} />
            <button type="submit" style={{ padding: '12px', backgroundColor: '#10B981', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
              + Dar de Alta Fisioterapeuta
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;