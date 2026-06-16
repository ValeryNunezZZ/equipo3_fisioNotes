import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function PacienteDashboard() {
  const navigate = useNavigate();
  
  // Datos del paciente y su sesión
  const correoPaciente = localStorage.getItem('correo');
  const [perfil, setPerfil] = useState(null);
  
  // Estado de la agenda y reportes
  const [agendaHoy, setAgendaHoy] = useState([]);
  const [mostrarEvaluacion, setMostrarEvaluacion] = useState(false);
  const [reporte, setReporte] = useState({ nivel_dolor: 5, comentarios: '' });
  const [rutinaFinalizada, setRutinaFinalizada] = useState(false);

  // 1. Cargar quién es el paciente y en qué estado está
  const fetchPerfil = async () => {
    try {
      const response = await axios.get(`http://localhost:3000/api/paciente/perfil/${correoPaciente}`);
      setPerfil(response.data);
      
      // Si sigue activo, buscamos su misión de hoy
      if (response.data.estado_tratamiento === 'ACTIVO') {
        fetchAgendaHoy(response.data.id_paciente);
      }
    } catch (error) {
      console.error("Error al cargar perfil:", error);
    }
  };

  // 2. Cargar los ejercicios del día
  const fetchAgendaHoy = async (idPaciente) => {
    try {
      const response = await axios.get(`http://localhost:3000/api/agenda/${idPaciente}/hoy`);
      setAgendaHoy(response.data);
      
      // Validar si ya terminó todos los de hoy al cargar la página
      const todosCompletos = response.data.length > 0 && response.data.every(ej => ej.estado_completado);
      if (todosCompletos) setMostrarEvaluacion(true);
      
    } catch (error) {
      console.error("Error al cargar agenda:", error);
    }
  };

  useEffect(() => {
    fetchPerfil();
  }, []);

  const cerrarSesion = () => {
    localStorage.clear();
    navigate('/login');
  };

  // 3. Marcar un ejercicio como hecho
  const toggleEjercicio = async (id_agenda, estadoActual) => {
    try {
      const nuevoEstado = !estadoActual;
      await axios.patch(`http://localhost:3000/api/agenda/${id_agenda}/completar`, {
        estado_completado: nuevoEstado
      });

      // Actualizamos la vista localmente
      const agendaActualizada = agendaHoy.map(ej => 
        ej.id_agenda === id_agenda ? { ...ej, estado_completado: nuevoEstado } : ej
      );
      setAgendaHoy(agendaActualizada);

      // Mecánica de Gamificación: Si completa todos, "desbloquea" la evaluación
      const todosCompletos = agendaActualizada.every(ej => ej.estado_completado);
      setMostrarEvaluacion(todosCompletos);

    } catch (error) {
      console.error("Error al actualizar ejercicio:", error);
    }
  };

  // 4. Enviar el reporte de dolor para el Fisio
  const enviarReporteFinal = async () => {
    try {
      const agendaIds = agendaHoy.map(ej => ej.id_agenda);
      await axios.post('http://localhost:3000/api/reportes', {
        agendaIds,
        nivel_dolor: reporte.nivel_dolor,
        comentarios: reporte.comentarios
      });
      setRutinaFinalizada(true);
    } catch (error) {
      console.error("Error al enviar reporte:", error);
      alert("Hubo un error al guardar tu progreso.");
    }
  };

  // Pantalla de carga mientras trae los datos
  if (!perfil) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#F3F4F6' }}><h3>Cargando tu expediente...</h3></div>;

  // =========================================================================
  // PANTALLA DE VICTORIA (Gamificación y Storytelling de Cierre)
  // =========================================================================
  if (perfil.estado_tratamiento === 'RECUPERADO') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: '#ECFDF5', fontFamily: 'sans-serif', padding: '20px', textAlign: 'center' }}>
        <div style={{ backgroundColor: 'white', padding: '50px', borderRadius: '15px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', maxWidth: '600px' }}>
          <div style={{ fontSize: '80px', marginBottom: '20px' }}>🌟</div>
          <h1 style={{ color: '#065F46', marginBottom: '10px' }}>¡Misión Cumplida, {perfil.nombre}!</h1>
          <p style={{ color: '#047857', fontSize: '18px', lineHeight: '1.6', marginBottom: '30px' }}>
            Tu fisioterapeuta ha dictaminado tu alta médica. Cada ejercicio que marcaste, cada día que fuiste constante y cada esfuerzo que hiciste te trajo hasta aquí. Tu cuerpo ha sanado gracias a tu perseverancia.
          </p>
          <div style={{ padding: '20px', backgroundColor: '#D1FAE5', borderRadius: '8px', color: '#065F46', fontWeight: 'bold', marginBottom: '30px' }}>
            El equipo de FisioNotes celebra tu recuperación. ¡Sigue cuidando de ti!
          </div>
          <button onClick={cerrarSesion} style={{ padding: '12px 30px', backgroundColor: '#10B981', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }}>
            Cerrar Sesión
          </button>
        </div>
      </div>
    );
  }

  // =========================================================================
  // TABLERO ACTIVO (Rutina Diaria)
  // =========================================================================
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F3F4F6', fontFamily: 'sans-serif', paddingBottom: '50px' }}>
      
      {/* Navbar Minimalista (Corregido con flexWrap) */}
      <nav style={{ backgroundColor: 'white', padding: '20px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
        <h2 style={{ margin: 0, color: '#3B82F6' }}>FisioNotes <span style={{ color: '#9CA3AF', fontSize: '16px', fontWeight: 'normal' }}>| Mi Recuperación</span></h2>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ color: '#4B5563', fontWeight: 'bold' }}>Hola, {perfil.nombre}</span>
          <button onClick={cerrarSesion} style={{ padding: '8px 16px', backgroundColor: '#EF4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Salir</button>
        </div>
      </nav>

      <div style={{ maxWidth: '800px', margin: '40px auto', padding: '0 20px' }}>
        
        <div style={{ marginBottom: '30px' }}>
          <h1 style={{ color: '#1F2937', margin: '0 0 10px 0' }}>Tu Plan para Hoy</h1>
          <p style={{ color: '#6B7280', margin: 0, fontSize: '16px' }}>Marca los ejercicios conforme los vayas terminando. La constancia es la clave de tu mejora.</p>
        </div>

        {agendaHoy.length === 0 ? (
          <div style={{ backgroundColor: 'white', padding: '50px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
            <span style={{ fontSize: '50px' }}>🛋️</span>
            <h2 style={{ color: '#374151' }}>¡Día Libre!</h2>
            <p style={{ color: '#6B7280' }}>Hoy no tienes ejercicios programados. Usa este día para descansar tus músculos.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {/* Lista de Tareas con Series, Repeticiones y YouTube */}
            {agendaHoy.map((item) => (
              <div 
                key={item.id_agenda} 
                onClick={(e) => {
                  // Evitamos que al dar clic al enlace de YouTube se marque como completado
                  if(e.target.tagName !== 'A') !rutinaFinalizada && toggleEjercicio(item.id_agenda, item.estado_completado);
                }}
                style={{ 
                  backgroundColor: item.estado_completado ? '#EFF6FF' : 'white', 
                  border: item.estado_completado ? '2px solid #3B82F6' : '1px solid #E5E7EB',
                  padding: '15px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '20px',
                  cursor: rutinaFinalizada ? 'default' : 'pointer', transition: 'all 0.2s', opacity: rutinaFinalizada ? 0.7 : 1
                }}>
                
                {/* Checkbox Visual */}
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', border: item.estado_completado ? 'none' : '2px solid #D1D5DB', backgroundColor: item.estado_completado ? '#3B82F6' : 'transparent', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'white', fontWeight: 'bold', flexShrink: 0 }}>
                  {item.estado_completado && '✓'}
                </div>

                <div style={{ flexGrow: 1 }}>
                  <h3 style={{ margin: '0 0 5px 0', color: '#1F2937', textDecoration: item.estado_completado ? 'line-through' : 'none' }}>{item.ejercicio.nombre}</h3>
                  <p style={{ margin: '0 0 8px 0', color: '#4B5563', fontSize: '14px', fontWeight: 'bold' }}>
                    🔄 {item.series} Series | 🎯 {item.repeticiones} Repeticiones
                  </p>
                  
                  {/* Botón de YouTube */}
                  {item.ejercicio.url_video && (
                    <a href={item.ejercicio.url_video} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', backgroundColor: '#FEF2F2', color: '#DC2626', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', textDecoration: 'none', border: '1px solid #FCA5A5' }}>
                      ▶️ Ver tutorial
                    </a>
                  )}
                </div>

                {/* Imagen del Ejercicio (Corregida con etiqueta <img>) */}
                <div style={{ width: '80px', height: '80px', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#ECF0F1', flexShrink: 0, border: '1px solid #E5E7EB' }}>
                  <img 
                    src={item.ejercicio.url_imagen || 'https://via.placeholder.com/150?text=FisioNotes'} 
                    alt={item.ejercicio.nombre}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => { e.target.onerror = null; e.target.src = 'https://via.placeholder.com/150?text=Sin+Imagen'; }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Zona de Evaluación (Aparece solo cuando todos los ejercicios tienen check) */}
        {mostrarEvaluacion && !rutinaFinalizada && agendaHoy.length > 0 && (
          <div style={{ marginTop: '40px', backgroundColor: 'white', padding: '30px', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', borderTop: '5px solid #10B981', animation: 'fadeIn 0.5s' }}>
            <h2 style={{ color: '#1F2937', marginTop: 0 }}>¡Excelente trabajo! 👏</h2>
            <p style={{ color: '#4B5563', marginBottom: '20px' }}>Para guardar tu progreso de hoy, ayúdanos a medir cómo te sentiste.</p>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontWeight: 'bold', color: '#374151', marginBottom: '10px' }}>
                Nivel de dolor durante la rutina: <span style={{ fontSize: '20px', color: '#EF4444' }}>{reporte.nivel_dolor}/10</span>
              </label>
              <input 
                type="range" min="1" max="10" 
                value={reporte.nivel_dolor} 
                onChange={(e) => setReporte({...reporte, nivel_dolor: parseInt(e.target.value)})}
                style={{ width: '100%', cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#9CA3AF', fontSize: '12px', marginTop: '5px' }}>
                <span>1 (Casi nada)</span><span>5 (Moderado)</span><span>10 (Incapaz de hacerlos)</span>
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontWeight: 'bold', color: '#374151', marginBottom: '10px' }}>Comentarios para tu Fisioterapeuta (Opcional):</label>
              <textarea 
                rows="3" 
                placeholder="Ej. Sentí un pinchazo en el hombro al levantar el brazo..."
                value={reporte.comentarios}
                onChange={(e) => setReporte({...reporte, comentarios: e.target.value})}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #D1D5DB', boxSizing: 'border-box' }}
              />
            </div>

            <button onClick={enviarReporteFinal} style={{ width: '100%', padding: '15px', backgroundColor: '#10B981', color: 'white', border: 'none', borderRadius: '8px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 6px rgba(16, 185, 129, 0.3)' }}>
              Guardar Progreso de Hoy
            </button>
          </div>
        )}

        {/* Mensaje de Éxito al finalizar el día */}
        {rutinaFinalizada && (
          <div style={{ marginTop: '40px', backgroundColor: '#D1FAE5', padding: '30px', borderRadius: '12px', textAlign: 'center', color: '#065F46' }}>
            <h2>¡Progreso guardado! 📈</h2>
            <p>Tu fisioterapeuta ha recibido tu actualización. Descansa y nos vemos en tu próxima sesión.</p>
          </div>
        )}

      </div>
    </div>
  );
}

export default PacienteDashboard;