import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/AdminDashboard.css';

function AdminDashboard() {
  const navigate = useNavigate();
  const [fisios, setFisios] = useState([]);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [fisioData, setFisioData] = useState({
    nombre: '',
    especialidad: '',
    cedula_profesional: '',
    email: '',
    password: ''
  });

  const correoAdmin = localStorage.getItem('correo');

  const fetchFisios = async () => {
    try {
      const response = await axios.get('http://localhost:3000/api/fisios');
      setFisios(response.data);
    } catch (error) {
      console.error("Error al cargar fisioterapeutas:", error);
    }
  };

  useEffect(() => {
    fetchFisios();
  }, []);

  const cerrarSesion = () => {
    localStorage.clear();
    navigate('/login');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:3000/api/fisios', fisioData);
      alert("¡Fisioterapeuta registrado con éxito!");
      setFisioData({ nombre: '', especialidad: '', cedula_profesional: '', email: '', password: '' });
      setMostrarFormulario(false);
      fetchFisios();
    } catch (error) {
      alert(error.response?.data?.error || "Hubo un error al registrar");
    }
  };

  return (
    <div className="admin-wrap">
      
      {/* Panel Lateral */}
      <aside className="admin-sidebar">
        <h2>FisioNotes</h2>
        <span className="role-name">Administrador Root</span>
        <nav className="sidebar-nav" style={{ marginTop: '30px' }}>
          <a className="sidebar-link active">
            <span>👨‍⚕️ Fisioterapeutas</span>
          </a>
          <a className="sidebar-link" style={{ opacity: 0.5, cursor: 'not-allowed' }} title="Próximamente">
            <span>⚙️ Ajustes de Sistema</span>
          </a>
        </nav>
        <button onClick={cerrarSesion} className="btn btn-danger" style={{ marginTop: 'auto' }}>
          Salir del Sistema
        </button>
      </aside>

      {/* Contenido Principal */}
      <main className="admin-main">
        
        <div className="admin-header">
          <div>
            <h1 style={{ margin: 0 }}>Gestión de Personal Médico</h1>
            <p style={{ color: 'var(--text-muted)', margin: '5px 0 0 0' }}>Administra los accesos de los fisioterapeutas de tu clínica.</p>
          </div>
          <button onClick={() => setMostrarFormulario(!mostrarFormulario)} className="btn btn-admin">
            {mostrarFormulario ? 'Cancelar Registro' : '+ Nuevo Fisioterapeuta'}
          </button>
        </div>

        {/* Formulario Nuevo Fisio */}
        {mostrarFormulario && (
          <div className="admin-card" style={{ borderTopColor: '#10B981' }}>
            <h3 style={{ marginTop: 0 }}>Registrar Fisioterapeuta</h3>
            <form onSubmit={handleSubmit} className="input-group">
              <div className="input-row">
                <input type="text" className="form-input" placeholder="Nombre Completo (Ej. Dr. Juan Pérez)" value={fisioData.nombre} onChange={(e) => setFisioData({...fisioData, nombre: e.target.value})} required />
                <input type="text" className="form-input" placeholder="Especialidad (Ej. Deportiva)" value={fisioData.especialidad} onChange={(e) => setFisioData({...fisioData, especialidad: e.target.value})} required />
                <input type="text" className="form-input" placeholder="Cédula Profesional" value={fisioData.cedula_profesional} onChange={(e) => setFisioData({...fisioData, cedula_profesional: e.target.value})} required />
              </div>
              <div className="input-row">
                <input type="email" className="form-input" placeholder="Correo Electrónico (Para iniciar sesión)" value={fisioData.email} onChange={(e) => setFisioData({...fisioData, email: e.target.value})} required />
                <input type="password" className="form-input" placeholder="Contraseña Temporal" value={fisioData.password} onChange={(e) => setFisioData({...fisioData, password: e.target.value})} required />
              </div>
              <button type="submit" className="btn btn-admin" style={{ alignSelf: 'flex-start', marginTop: '10px' }}>
                Dar de Alta en el Sistema
              </button>
            </form>
          </div>
        )}

        {/* Tabla del Personal */}
        <div className="admin-card">
          {fisios.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>No hay fisioterapeutas registrados actualmente.</p>
          ) : (
            <table className="styled-table">
              <thead>
                <tr>
                  <th>Doctor(a)</th>
                  <th>Especialidad</th>
                  <th>Cédula</th>
                  <th>Pacientes Activos</th>
                </tr>
              </thead>
              <tbody>
                {fisios.map((f) => (
                  <tr key={f.id_fisio}>
                    <td>
                      <strong style={{ color: 'var(--text-main)' }}>{f.nombre}</strong><br/>
                      <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{f.usuario?.email}</span>
                    </td>
                    <td>{f.especialidad}</td>
                    <td><code style={{ backgroundColor: '#F3F4F6', padding: '4px 8px', borderRadius: '4px', fontSize: '13px' }}>{f.cedula_profesional}</code></td>
                    <td>
                      <span style={{ backgroundColor: '#EFF6FF', color: '#3B82F6', padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>
                        {f.pacientes ? f.pacientes.length : 0}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}

export default AdminDashboard;