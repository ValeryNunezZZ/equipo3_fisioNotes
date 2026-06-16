import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function Login() {
  const navigate = useNavigate();
  // Estado para capturar el correo y contraseña
  const [credenciales, setCredenciales] = useState({ correo: '', password: '' });
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setCredenciales({ ...credenciales, [e.target.name]: e.target.value });
  };

  const handleLoginReal = async (e) => {
    e.preventDefault();
    setError(''); // Limpiamos errores previos

    try {
      // Hacemos la petición al backend real
      const response = await axios.post('http://localhost:3000/api/login', credenciales);
      
      // Guardamos el token y el rol en el almacenamiento del navegador
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('rol', response.data.rol);
      localStorage.setItem('correo', credenciales.correo);
      localStorage.setItem('nombre', response.data.nombre);

      // RF-01: Redirigimos al tablero correspondiente según el rol
      if (response.data.rol === 'ADMIN') {
        navigate('/admin');
      } else if (response.data.rol === 'FISIO') {
        navigate('/fisio'); // Esta pantalla la crearemos después
      } else {
        navigate('/paciente'); // Esta pantalla la crearemos después
      }

    } catch (err) {
      // Mostramos el error si las credenciales son incorrectas
      setError(err.response?.data?.error || 'Error al conectar con el servidor');
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'sans-serif', backgroundColor: '#f4f7f6' }}>
      <div style={{ border: '1px solid #ddd', padding: '40px', borderRadius: '10px', textAlign: 'center', backgroundColor: 'white', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}>
        <h2 style={{ color: '#333' }}>FisioNotes</h2>
        <p style={{ color: '#666', marginBottom: '20px' }}>Inicia sesión en tu cuenta</p>
        
        {/* Alerta de error visual */}
        {error && <div style={{ color: 'red', marginBottom: '15px', padding: '10px', backgroundColor: '#ffe6e6', borderRadius: '5px' }}>{error}</div>}

        <form onSubmit={handleLoginReal} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <input 
            type="email" 
            name="correo"
            placeholder="Correo electrónico" 
            value={credenciales.correo}
            onChange={handleChange}
            required 
            style={{ padding: '12px', borderRadius: '5px', border: '1px solid #ccc', fontSize: '15px' }} 
          />
          <input 
            type="password" 
            name="password"
            placeholder="Contraseña" 
            value={credenciales.password}
            onChange={handleChange}
            required 
            style={{ padding: '12px', borderRadius: '5px', border: '1px solid #ccc', fontSize: '15px' }} 
          />
          <button type="submit" style={{ padding: '12px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' }}>
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;