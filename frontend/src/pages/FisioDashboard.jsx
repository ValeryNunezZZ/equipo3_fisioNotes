import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

function FisioDashboard() {
  const navigate = useNavigate();
  
  const [vistaActiva, setVistaActiva] = useState('pacientes'); 
  const [pacientes, setPacientes] = useState([]);
  const [ejercicios, setEjercicios] = useState([]);
  const [alertas, setAlertas] = useState([]); 
  
  const [pacienteSeleccionado, setPacienteSeleccionado] = useState(null);
  const [datosProgreso, setDatosProgreso] = useState([]);
  
  const correoFisioActual = localStorage.getItem('correo'); 
  const nombreFisioActual = localStorage.getItem('nombre');

  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [pacienteData, setPacienteData] = useState({ nombre: '', telefono: '', diagnostico: '', email: '', password: '' });
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });

  // NUEVOS ESTADOS PARA EL CATÁLOGO DE EJERCICIOS
  const [mostrarFormEjercicio, setMostrarFormEjercicio] = useState(false);
  const [ejercicioData, setEjercicioData] = useState({ nombre: '', descripcion: '', zona_cuerpo: '', url_imagen: '' });

  // NUEVOS ESTADOS PARA ASIGNAR PLANES
  const [pacienteParaPlan, setPacienteParaPlan] = useState(null);
  const [planData, setPlanData] = useState({ 
    id_ejercicio: '', fecha_inicio: '', fecha_fin: '', series: 3, repeticiones: 10, dias: [] 
  });

  const fetchPacientes = async () => {
    try {
      const response = await axios.get(`http://localhost:3000/api/pacientes/${correoFisioActual}`);
      setPacientes(response.data);
    } catch (error) { console.error("Error al cargar pacientes:", error); }
  };

  const fetchEjercicios = async () => {
    try {
      const response = await axios.get('http://localhost:3000/api/ejercicios');
      setEjercicios(response.data);
    } catch (error) { console.error("Error al cargar catálogo:", error); }
  };

  const fetchAlertas = async () => {
    try {
      const response = await axios.get(`http://localhost:3000/api/alertas/${correoFisioActual}`);
      setAlertas(response.data);
    } catch (error) { console.error("Error al cargar alertas:", error); }
  };

  useEffect(() => {
    fetchPacientes();
    fetchEjercicios();
    fetchAlertas(); 
  }, []);

  const cerrarSesion = () => {
    localStorage.clear();
    navigate('/login');
  };

  const marcarAlertaRevisada = async (id_reporte) => {
    try {
      await axios.patch(`http://localhost:3000/api/reportes/${id_reporte}/leido`);
      fetchAlertas();
    } catch (error) { console.error("Error al marcar como leída:", error); }
  };

  // --- FUNCIONES DE PACIENTES ---
  const handlePacienteSubmit = async (e) => {
    e.preventDefault();
    setMensaje({ texto: 'Guardando...', tipo: 'loading' });
    try {
      await axios.post('http://localhost:3000/api/pacientes', { email_fisio: correoFisioActual, ...pacienteData });
      setMensaje({ texto: '¡Paciente registrado con éxito!', tipo: 'success' });
      setPacienteData({ nombre: '', telefono: '', diagnostico: '', email: '', password: '' });
      fetchPacientes();
      setTimeout(() => { setMostrarFormulario(false); setMensaje({ texto: '', tipo: '' }); }, 2000);
    } catch (error) {
      setMensaje({ texto: `Error: ${error.response?.data?.error || 'Error'}`, tipo: 'error' });
    }
  };

  const handleAltaMedica = async (id_paciente) => {
    if (!window.confirm('¿Estás seguro de dictaminar el alta médica?')) return;
    try {
      await axios.patch(`http://localhost:3000/api/pacientes/${id_paciente}/alta`);
      fetchPacientes();
      setPacienteSeleccionado(null);
    } catch (error) {
      alert('Hubo un error al procesar el alta médica.');
    }
  };

  const abrirProgreso = async (paciente) => {
    setPacienteSeleccionado(paciente);
    try {
      const response = await axios.get(`http://localhost:3000/api/pacientes/${paciente.id_paciente}/progreso`);
      setDatosProgreso(response.data);
    } catch (error) { setDatosProgreso([]); }
  };

  // --- FUNCIONES DE CATÁLOGO ---
  const handleEjercicioSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:3000/api/ejercicios', ejercicioData);
      setEjercicioData({ nombre: '', descripcion: '', zona_cuerpo: '', url_imagen: '' });
      setMostrarFormEjercicio(false);
      fetchEjercicios(); // Refrescar catálogo
      alert("Ejercicio agregado con éxito");
    } catch (error) {
      alert("Error al agregar ejercicio");
    }
  };

  // --- FUNCIONES DE PLANES (RECETAS) ---
  const toggleDia = (dia) => {
    if (planData.dias.includes(dia)) {
      setPlanData({ ...planData, dias: planData.dias.filter(d => d !== dia) });
    } else {
      setPlanData({ ...planData, dias: [...planData.dias, dia] });
    }
  };

  const handlePlanSubmit = async (e) => {
    e.preventDefault();
    if (planData.dias.length === 0) return alert("Selecciona al menos un día de la semana");
    if (!planData.id_ejercicio) return alert("Selecciona un ejercicio del catálogo");

    try {
      const payload = {
        id_paciente: pacienteParaPlan.id_paciente,
        plan_ejercicios: [{
          id_ejercicio: planData.id_ejercicio,
          frecuencia_dias: planData.dias,
          fecha_inicio: planData.fecha_inicio,
          fecha_fin: planData.fecha_fin,
          series: parseInt(planData.series),
          repeticiones: parseInt(planData.repeticiones)
        }]
      };

      await axios.post('http://localhost:3000/api/planes', payload);
      alert("¡Plan recetado con éxito! Se ha generado la agenda del paciente.");
      setPacienteParaPlan(null); // Cerrar modal
      setPlanData({ id_ejercicio: '', fecha_inicio: '', fecha_fin: '', series: 3, repeticiones: 10, dias: [] });
    } catch (error) {
      alert(error.response?.data?.error || "Error al recetar el plan");
    }
  };

  const linkStyle = (vista) => ({
    color: vistaActiva === vista ? 'white' : '#BDC3C7',
    textDecoration: 'none',
    fontWeight: vistaActiva === vista ? 'bold' : 'normal',
    cursor: 'pointer',
    padding: '8px',
    borderRadius: '4px',
    backgroundColor: vistaActiva === vista ? '#34495E' : 'transparent'
  });

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      
      {/* Panel Lateral */}
      <div style={{ width: '250px', backgroundColor: '#2C3E50', color: 'white', padding: '20px', display: 'flex', flexDirection: 'column' }}>
        <h2>FisioNotes</h2>
        <p style={{ color: '#BDC3C7', fontSize: '14px', fontWeight: 'bold' }}>{nombreFisioActual}</p>
        <nav style={{ marginTop: '30px', display: 'flex', flexDirection: 'column', gap: '10px', flexGrow: 1 }}>
          <a onClick={() => setVistaActiva('pacientes')} style={linkStyle('pacientes')}>
            👥 Mis Pacientes {alertas.length > 0 && <span style={{ backgroundColor: '#E74C3C', color: 'white', padding: '2px 6px', borderRadius: '10px', fontSize: '12px', marginLeft: '5px' }}>{alertas.length}</span>}
          </a>
          <a onClick={() => setVistaActiva('catalogo')} style={linkStyle('catalogo')}>🏋️ Catálogo Ejercicios</a>
        </nav>
        <button onClick={cerrarSesion} style={{ padding: '10px', backgroundColor: '#E74C3C', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Salir</button>
      </div>

      {/* Contenido Principal */}
      <div style={{ flexGrow: 1, padding: '30px', backgroundColor: '#ECF0F1', overflowY: 'auto', position: 'relative' }}>
        
        {vistaActiva === 'pacientes' ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
                <h1 style={{ color: '#2C3E50', margin: 0 }}>Mis Pacientes</h1>
                <button onClick={() => setMostrarFormulario(!mostrarFormulario)}>
                {mostrarFormulario ? 'Cancelar' : '+ Añadir Paciente'}
              </button>
            </div>

            {/* WIDGET ALERTAS */}
            {alertas.length > 0 && (
              <div style={{ backgroundColor: '#FEF2F2', borderLeft: '5px solid #EF4444', padding: '20px', borderRadius: '8px', marginBottom: '25px' }}>
                <h3 style={{ margin: '0 0 10px 0', color: '#B91C1C' }}>⚠️ Atención Requerida (Dolor &gt; 7)</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {alertas.map((alerta) => (
                    <div key={alerta.id_reporte} style={{ backgroundColor: 'white', padding: '15px', borderRadius: '6px', border: '1px solid #FCA5A5' }}>
                      <p style={{ margin: '0 0 8px 0', fontSize: '15px', color: '#1F2937' }}>
                        🚨 Paciente: <strong style={{ fontSize: '18px', color: '#B91C1C' }}>{alerta.paciente}</strong> <br/>
                        Reportó un dolor de <span style={{ color: '#EF4444', fontWeight: 'bold', fontSize: '16px' }}>{alerta.nivel_dolor}/10</span> al realizar: <em>{alerta.ejercicio}</em>.
                      </p>
                      {alerta.comentarios && (
                         <p style={{ margin: '0 0 10px 0', fontStyle: 'italic', color: '#6B7280', fontSize: '14px' }}>"{alerta.comentarios}"</p>
                      )}
                      <button onClick={() => marcarAlertaRevisada(alerta.id_reporte)} style={{ padding: '6px 12px', backgroundColor: '#EF4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>✓ Marcar como revisado</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* FORMULARIO NUEVO PACIENTE */}
            {mostrarFormulario && (
              <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
                <h3>Registrar Nuevo Paciente</h3>
                {mensaje.texto && <div style={{ padding: '10px', marginBottom: '15px', color: mensaje.tipo === 'error' ? 'red' : 'green' }}>{mensaje.texto}</div>}
                <form onSubmit={handlePacienteSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <input type="text" name="nombre" placeholder="Nombre completo" value={pacienteData.nombre} onChange={(e) => setPacienteData({...pacienteData, nombre: e.target.value})} required style={{ padding: '10px' }} />
                  <input type="tel" name="telefono" placeholder="Teléfono" value={pacienteData.telefono} onChange={(e) => setPacienteData({...pacienteData, telefono: e.target.value})} required style={{ padding: '10px' }} />
                  <input type="email" name="email" placeholder="Correo del paciente" value={pacienteData.email} onChange={(e) => setPacienteData({...pacienteData, email: e.target.value})} required style={{ padding: '10px' }} />
                  <input type="password" name="password" placeholder="Contraseña temporal" value={pacienteData.password} onChange={(e) => setPacienteData({...pacienteData, password: e.target.value})} required style={{ padding: '10px' }} />
                  <textarea name="diagnostico" placeholder="Diagnóstico" value={pacienteData.diagnostico} onChange={(e) => setPacienteData({...pacienteData, diagnostico: e.target.value})} required style={{ padding: '10px' }}></textarea>
                  <button type="submit" style={{ padding: '10px', backgroundColor: '#3498DB', color: 'white', border: 'none', borderRadius: '5px' }}>Guardar</button>
                </form>
              </div>
            )}

            {/* LISTA DE PACIENTES */}
            <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px' }}>
              {pacientes.length === 0 ? <p>No hay pacientes registrados.</p> : (
                <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                  <thead><tr style={{ borderBottom: '2px solid #ddd' }}><th>Nombre</th><th>Estado</th><th>Acciones</th></tr></thead>
                  <tbody>
                    {pacientes.map(p => (
                      <tr key={p.id_paciente} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '12px' }}>{p.nombre}</td>
                        <td style={{ padding: '12px', fontWeight: 'bold', color: p.estado_tratamiento === 'RECUPERADO' ? '#27AE60' : '#F39C12' }}>
                          {p.estado_tratamiento === 'RECUPERADO' ? '✅ Alta' : '🏃‍♂️ Activo'}
                        </td>
                        <td style={{ padding: '12px', display: 'flex', gap: '10px' }}>
                          <button onClick={() => abrirProgreso(p)} style={{ padding: '6px 12px', backgroundColor: '#3498DB', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>📊 Historial</button>
                          
                          {/* BOTÓN PARA CREAR PLAN (Solo si está activo) */}
                          {p.estado_tratamiento !== 'RECUPERADO' && (
                            <button onClick={() => setPacienteParaPlan(p)} style={{ padding: '6px 12px', backgroundColor: '#8E44AD', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>📝 Recetar Plan</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        ) : (
          // ==========================================
          // VISTA: CATÁLOGO DE EJERCICIOS
          // ==========================================
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
            <div>
                <h1 style={{ color: '#2C3E50', margin: 0 }}>Catálogo de Ejercicios</h1>
                <p style={{ color: '#7F8C8D', margin: '5px 0 0 0' }}>Agrega y gestiona los ejercicios para tus planes.</p>
              </div>
              <button onClick={() => setMostrarFormEjercicio(!mostrarFormEjercicio)} style={{ padding: '10px 20px', backgroundColor: '#27AE60', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
                {mostrarFormEjercicio ? 'Cancelar' : '+ Nuevo Ejercicio'}
              </button>
            </div>

            {/* FORMULARIO AGREGAR EJERCICIO */}
            {mostrarFormEjercicio && (
              <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', marginBottom: '20px', borderLeft: '5px solid #27AE60' }}>
                <h3>Detalles del Ejercicio</h3>
                <form onSubmit={handleEjercicioSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <div style={{ display: 'flex', gap: '15px' }}>
                    <input type="text" placeholder="Nombre (ej. Elevación de hombro)" value={ejercicioData.nombre} onChange={(e) => setEjercicioData({...ejercicioData, nombre: e.target.value})} required style={{ padding: '10px', flex: 1, border: '1px solid #ccc', borderRadius: '4px' }} />
                    <input type="text" placeholder="Zona (ej. Hombro derecho)" value={ejercicioData.zona_cuerpo} onChange={(e) => setEjercicioData({...ejercicioData, zona_cuerpo: e.target.value})} required style={{ padding: '10px', flex: 1, border: '1px solid #ccc', borderRadius: '4px' }} />
                  </div>
                  <input type="url" placeholder="URL de imagen de referencia (opcional)" value={ejercicioData.url_imagen} onChange={(e) => setEjercicioData({...ejercicioData, url_imagen: e.target.value})} style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }} />
                  <textarea placeholder="Descripción y recomendaciones de técnica" value={ejercicioData.descripcion} onChange={(e) => setEjercicioData({...ejercicioData, descripcion: e.target.value})} required rows="2" style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }}></textarea>
                  <button type="submit" style={{ padding: '10px', backgroundColor: '#27AE60', color: 'white', border: 'none', borderRadius: '5px', fontWeight: 'bold' }}>Guardar en Catálogo</button>
                </form>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
              {ejercicios.length === 0 ? <p>El catálogo está vacío. ¡Agrega tu primer ejercicio!</p> : (
                ejercicios.map((ej) => (
                  <div key={ej.id_ejercicio} style={{ backgroundColor: 'white', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
                    <div style={{ height: '160px', backgroundColor: '#ECF0F1', overflow: 'hidden' }}>
                    <img 
                        src={ej.url_imagen || 'https://via.placeholder.com/300x160?text=Sin+Imagen'} 
                        alt={ej.nombre}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => {
                        e.target.onerror = null; // Evita un bucle infinito si la de repuesto también falla
                        e.target.src = 'https://via.placeholder.com/300x160?text=Enlace+Protegido/Roto';
                        }}
                    />
                    </div>
                    <div style={{ padding: '15px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#2980B9', backgroundColor: '#EBF5FB', padding: '3px 8px', borderRadius: '10px' }}>{ej.zona_cuerpo}</span>
                      <h3 style={{ margin: '10px 0', fontSize: '18px', color: '#2C3E50' }}>{ej.nombre}</h3>
                      <p style={{ fontSize: '14px', color: '#7F8C8D' }}>{ej.descripcion}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {/* ==========================================
            MODAL: RECETAR PLAN DE EJERCICIOS
            ========================================== */}
        {pacienteParaPlan && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '12px', width: '90%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #ECF0F1', paddingBottom: '10px', marginBottom: '20px' }}>
                <h2 style={{ margin: 0, color: '#8E44AD' }}>Recetar Ejercicio: {pacienteParaPlan.nombre}</h2>
                <button onClick={() => setPacienteParaPlan(null)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#7F8C8D' }}>✖</button>
              </div>

              {ejercicios.length === 0 ? (
                <div style={{ padding: '20px', backgroundColor: '#FEF9E7', color: '#D35400', borderRadius: '8px', textAlign: 'center' }}>
                  Aún no hay ejercicios en tu catálogo. Ve a la pestaña "Catálogo Ejercicios" para agregar uno primero.
                </div>
              ) : (
                <form onSubmit={handlePlanSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  
                  <div>
                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>1. Selecciona el Ejercicio</label>
                    <select required value={planData.id_ejercicio} onChange={(e) => setPlanData({...planData, id_ejercicio: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }}>
                      <option value="">-- Elige del Catálogo --</option>
                      {ejercicios.map(ej => <option key={ej.id_ejercicio} value={ej.id_ejercicio}>{ej.nombre} ({ej.zona_cuerpo})</option>)}
                    </select>
                  </div>

                  <div style={{ display: 'flex', gap: '15px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Fecha de Inicio</label>
                      <input type="date" required value={planData.fecha_inicio} onChange={(e) => setPlanData({...planData, fecha_inicio: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '5px', boxSizing: 'border-box' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Fecha de Fin</label>
                      <input type="date" required value={planData.fecha_fin} onChange={(e) => setPlanData({...planData, fecha_fin: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '5px', boxSizing: 'border-box' }} />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '15px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Series</label>
                      <input type="number" min="1" required value={planData.series} onChange={(e) => setPlanData({...planData, series: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '5px', boxSizing: 'border-box' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Repeticiones</label>
                      <input type="number" min="1" required value={planData.repeticiones} onChange={(e) => setPlanData({...planData, repeticiones: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '5px', boxSizing: 'border-box' }} />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '10px' }}>¿Qué días debe hacerlo?</label>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      {/* En JavaScript, getDay() devuelve: 0=Domingo, 1=Lunes, 2=Martes, etc. */}
                      {[{n: 1, l: 'Lun'}, {n: 2, l: 'Mar'}, {n: 3, l: 'Mié'}, {n: 4, l: 'Jue'}, {n: 5, l: 'Vie'}, {n: 6, l: 'Sáb'}, {n: 0, l: 'Dom'}].map(dia => (
                        <button type="button" key={dia.n} onClick={() => toggleDia(dia.n)} 
                          style={{ padding: '10px', width: '45px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', border: planData.dias.includes(dia.n) ? 'none' : '1px solid #ccc', backgroundColor: planData.dias.includes(dia.n) ? '#8E44AD' : 'white', color: planData.dias.includes(dia.n) ? 'white' : '#7F8C8D' }}>
                          {dia.l}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button type="submit" style={{ width: '100%', padding: '15px', backgroundColor: '#8E44AD', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' }}>
                    Guardar y Programar Agenda
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

        {/* MODAL DE HISTORIAL DE PROGRESO */}
        {pacienteSeleccionado && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '12px', width: '90%', maxWidth: '700px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '2px solid #ECF0F1', paddingBottom: '10px' }}>
                <div>
                  <h2 style={{ margin: 0, color: '#2C3E50' }}>Historial: {pacienteSeleccionado.nombre}</h2>
                  <p style={{ margin: '5px 0 0 0', color: '#7F8C8D', fontSize: '14px' }}>Diagnóstico: {pacienteSeleccionado.diagnostico}</p>
                </div>
                <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                  {pacienteSeleccionado.estado_tratamiento !== 'RECUPERADO' && (
                    <button onClick={() => handleAltaMedica(pacienteSeleccionado.id_paciente)} style={{ padding: '8px 15px', backgroundColor: '#27AE60', color: 'white', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>🎉 Dictaminar Alta</button>
                  )}
                  <button onClick={() => setPacienteSeleccionado(null)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>✖</button>
                </div>
              </div>
              {datosProgreso.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#7F8C8D', backgroundColor: '#F8F9FA', borderRadius: '8px' }}><p>Aún no hay reportes registrados.</p></div>
              ) : (
                <div style={{ height: '350px', width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={datosProgreso} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis dataKey="fecha" stroke="#7F8C8D" fontSize={12} />
                      <YAxis domain={[0, 10]} stroke="#7F8C8D" fontSize={12} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="dolor" stroke="#E74C3C" strokeWidth={3} name="Nivel de Dolor (1-10)" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default FisioDashboard;