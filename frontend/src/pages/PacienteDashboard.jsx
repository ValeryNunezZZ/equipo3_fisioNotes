import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/PacienteDashboard.css';

function PacienteDashboard() {
  const navigate = useNavigate();
  const correoPaciente = localStorage.getItem('correo');
  const [perfil, setPerfil] = useState(null);
  const [agendaHoy, setAgendaHoy] = useState([]);
  const [mostrarEvaluacion, setMostrarEvaluacion] = useState(false);
  const [reporte, setReporte] = useState({ nivel_dolor: 5, comentarios: '' });
  const [rutinaFinalizada, setRutinaFinalizada] = useState(false);

  const fetchPerfil = async () => {
    try {
      const response = await axios.get(`http://localhost:3000/api/paciente/perfil/${correoPaciente}`);
      setPerfil(response.data);
      if (response.data.estado_tratamiento === 'ACTIVO') fetchAgendaHoy(response.data.id_paciente);
    } catch (error) { console.error("Error al cargar perfil:", error); }
  };

  // 2. Cargar los ejercicios del día
    const fetchAgendaHoy = async (idPaciente) => {
    try {
      const response = await axios.get(`http://localhost:3000/api/agenda/${idPaciente}/hoy`);
      setAgendaHoy(response.data);
      
      // 🛠️ LA MAGIA: Cambiamos 'some' por 'every'
      // Solo bloqueamos la rutina si TODOS los ejercicios asignados para hoy ya fueron reportados.
      const todosReportados = response.data.length > 0 && response.data.every(ej => ej.reporteEstado !== null);
      
      if (todosReportados) {
        // Misión cumplida al 100%
        setRutinaFinalizada(true);
        setMostrarEvaluacion(false);
      } else {
        // Hay ejercicios nuevos o pendientes. Mantenemos la rutina activa.
        setRutinaFinalizada(false); 
        
        // Verificamos si ya marcó con palomita todos los ejercicios de la lista actual
        const todosCompletos = response.data.length > 0 && response.data.every(ej => ej.estado_completado);
        setMostrarEvaluacion(todosCompletos);
      }
      
    } catch (error) {
      console.error("Error al cargar agenda:", error);
    }
  };

  useEffect(() => { fetchPerfil(); }, []);

  const cerrarSesion = () => { localStorage.clear(); navigate('/login'); };

  const toggleEjercicio = async (id_agenda, estadoActual) => {
    try {
      const nuevoEstado = !estadoActual;
      await axios.patch(`http://localhost:3000/api/agenda/${id_agenda}/completar`, { estado_completado: nuevoEstado });
      const agendaActualizada = agendaHoy.map(ej => ej.id_agenda === id_agenda ? { ...ej, estado_completado: nuevoEstado } : ej);
      setAgendaHoy(agendaActualizada);
      setMostrarEvaluacion(agendaActualizada.every(ej => ej.estado_completado));
    } catch (error) { console.error("Error al actualizar ejercicio:", error); }
  };

  const enviarReporteFinal = async () => {
    try {
      const agendaIds = agendaHoy.map(ej => ej.id_agenda);
      await axios.post('http://localhost:3000/api/reportes', { agendaIds, nivel_dolor: reporte.nivel_dolor, comentarios: reporte.comentarios });
      setRutinaFinalizada(true);
    } catch (error) { alert("Hubo un error al guardar tu progreso."); }
  };

  if (!perfil) return <div className="paciente-wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><h3>Cargando tu expediente...</h3></div>;

  if (perfil.estado_tratamiento === 'RECUPERADO') {
    return (
      <div className="victoria-wrap">
        <div className="victoria-card">
          <div style={{ fontSize: '80px', marginBottom: '20px' }}>🌟</div>
          <h1 style={{ color: '#065F46', marginBottom: '10px' }}>¡Misión Cumplida, {perfil.nombre}!</h1>
          <p style={{ color: '#047857', fontSize: '18px', lineHeight: '1.6', marginBottom: '30px' }}>
            Tu fisioterapeuta ha dictaminado tu alta médica. Cada ejercicio que marcaste y cada esfuerzo que hiciste te trajo hasta aquí. Tu cuerpo ha sanado gracias a tu perseverancia.
          </p>
          <div style={{ padding: '20px', backgroundColor: '#D1FAE5', borderRadius: '8px', color: '#065F46', fontWeight: 'bold', marginBottom: '30px' }}>
            El equipo de FisioNotes celebra tu recuperación. ¡Sigue cuidando de ti!
          </div>
          <button onClick={cerrarSesion} className="btn btn-success" style={{ width: 'auto', padding: '12px 30px' }}>Cerrar Sesión</button>
        </div>
      </div>
    );
  }

  return (
    <div className="paciente-wrap">
      <nav className="paciente-nav">
        <h2>FisioNotes <span className="subtitle">| Mi Recuperación</span></h2>
        <div className="nav-actions">
          <span style={{ color: 'var(--text-main)', fontWeight: 'bold' }}>Hola, {perfil.nombre}</span>
          <button onClick={cerrarSesion} className="btn btn-danger">Salir</button>
        </div>
      </nav>

      <div className="paciente-content">
        <div style={{ marginBottom: '30px' }}>
          <h1 style={{ margin: '0 0 10px 0' }}>Tu Plan para Hoy</h1>
          <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '16px' }}>Marca los ejercicios conforme los vayas terminando. La constancia es la clave.</p>
        </div>

        {agendaHoy.length === 0 ? (
          <div className="victoria-card" style={{ padding: '50px', margin: '0 auto' }}>
            <span style={{ fontSize: '50px' }}>🛋️</span>
            <h2>¡Día Libre!</h2>
            <p style={{ color: 'var(--text-muted)' }}>Hoy no tienes ejercicios programados. Descansa tus músculos.</p>
          </div>
        ) : (
          <div className="lista-ejercicios">
            {agendaHoy.map((item) => (
              <div 
                key={item.id_agenda} 
                onClick={(e) => { if(e.target.tagName !== 'A') !rutinaFinalizada && toggleEjercicio(item.id_agenda, item.estado_completado); }}
                className={`tarjeta-ejercicio ${item.estado_completado ? 'completado' : ''} ${rutinaFinalizada ? 'inactivo' : ''}`}
              >
                <div className="checkbox-circle">{item.estado_completado && '✓'}</div>
                <div className="ejercicio-info">
                  <h3>{item.ejercicio.nombre}</h3>
                  <p>🔄 {item.series} Series | 🎯 {item.repeticiones} Repeticiones</p>
                  {item.ejercicio.url_video && (
                    <a href={item.ejercicio.url_video} target="_blank" rel="noopener noreferrer" className="btn-youtube">▶️ Ver tutorial</a>
                  )}
                </div>
                <div className="ejercicio-img">
                  <img src={item.ejercicio.url_imagen || 'https://via.placeholder.com/150?text=FisioNotes'} alt={item.ejercicio.nombre} onError={(e) => { e.target.onerror = null; e.target.src = 'https://via.placeholder.com/150?text=Sin+Imagen'; }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {mostrarEvaluacion && !rutinaFinalizada && agendaHoy.length > 0 && (
          <div className="evaluacion-box">
            <h2 style={{ marginTop: 0 }}>¡Excelente trabajo! 👏</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>Ayúdanos a medir cómo te sentiste para guardar tu progreso.</p>
            
            <div style={{ marginBottom: '25px' }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '10px' }}>
                Nivel de dolor durante la rutina: <span style={{ fontSize: '22px', color: 'var(--danger)' }}>{reporte.nivel_dolor}/10</span>
              </label>
              <input type="range" min="1" max="10" value={reporte.nivel_dolor} onChange={(e) => setReporte({...reporte, nivel_dolor: parseInt(e.target.value)})} />
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '12px', marginTop: '8px' }}>
                <span>1 (Casi nada)</span><span>5 (Moderado)</span><span>10 (Incapaz)</span>
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '10px' }}>Comentarios para tu Fisioterapeuta (Opcional):</label>
              <textarea rows="3" className="input-box" placeholder="Ej. Sentí un pinchazo en el hombro..." value={reporte.comentarios} onChange={(e) => setReporte({...reporte, comentarios: e.target.value})} />
            </div>

            <button onClick={enviarReporteFinal} className="btn btn-success">Guardar Progreso de Hoy</button>
          </div>
        )}

        {rutinaFinalizada && (
          <div style={{ marginTop: '40px', backgroundColor: '#D1FAE5', padding: '30px', borderRadius: '12px', textAlign: 'center', color: '#065F46' }}>
            <h2>¡Progreso guardado! 📈</h2>
            <p>Tu fisioterapeuta ha recibido tu actualización. Nos vemos en tu próxima sesión.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default PacienteDashboard;