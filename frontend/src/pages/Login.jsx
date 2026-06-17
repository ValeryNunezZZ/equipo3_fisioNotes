import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/Login.css';

function Login() {
  const navigate = useNavigate();
  const [credenciales, setCredenciales] = useState({ correo: '', password: '' });
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const handleChange = (e) => {
    setCredenciales({
      ...credenciales,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setCargando(true);

    try {
      const response = await axios.post('http://localhost:3000/api/login', credenciales);
      
      // Guardar sesión en el navegador
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('rol', response.data.rol);
      localStorage.setItem('nombre', response.data.nombre);
      localStorage.setItem('correo', credenciales.correo); // Vital para que el paciente y fisio funcionen

      // Redirigir según el rol
      if (response.data.rol === 'ADMIN') {
        navigate('/admin');
      } else if (response.data.rol === 'FISIO') {
        navigate('/fisio');
      } else if (response.data.rol === 'PACIENTE') {
        navigate('/paciente');
      }
      
    } catch (error) {
      setError(error.response?.data?.error || 'Error al conectar con el servidor');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="login-wrap">
      <div className="login-card">
        
        <div className="login-logo">
          <h1>FisioNotes</h1>
          <p>Plataforma Integral de Fisioterapia</p>
        </div>

        {error && <div className="login-error">{error}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="input-group">
            <label htmlFor="correo">Correo Electrónico</label>
            <input 
              type="email" 
              id="correo"
              name="correo" 
              className="login-input"
              placeholder="ejemplo@correo.com" 
              value={credenciales.correo} 
              onChange={handleChange} 
              required 
            />
          </div>

          <div className="input-group">
            <label htmlFor="password">Contraseña</label>
            <input 
              type="password" 
              id="password"
              name="password" 
              className="login-input"
              placeholder="••••••••" 
              value={credenciales.password} 
              onChange={handleChange} 
              required 
            />
          </div>

          <button type="submit" className="login-btn" disabled={cargando}>
            {cargando ? 'Iniciando sesión...' : 'Ingresar al Sistema'}
          </button>
        </form>

      </div>
    </div>
  );
}

export default Login;