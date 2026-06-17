import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import '../styles/FisioDashboard.css';

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

  const [mostrarFormEjercicio, setMostrarFormEjercicio] = useState(false);
  const [ejercicioData, setEjercicioData] = useState({ nombre: '', descripcion: '', zona_cuerpo: '', url_imagen: '', url_video: '' });

  const [pacienteParaPlan, setPacienteParaPlan] = useState(null);
  const [planData, setPlanData] = useState({ id_ejercicio: '', fecha_inicio: '', fecha_fin: '', series: 3, repeticiones: 10, dias: [] });

  const fetchPacientes = async () => { try { const res = await axios.get(`http://localhost:3000/api/pacientes/${correoFisioActual}`); setPacientes(res.data); } catch (e) {} };
  const fetchEjercicios = async () => { try { const res = await axios.get('http://localhost:3000/api/ejercicios'); setEjercicios(res.data); } catch (e) {} };
  const fetchAlertas = async () => { try { const res = await axios.get(`http://localhost:3000/api/alertas/${correoFisioActual}`); setAlertas(res.data); } catch (e) {} };

  useEffect(() => { fetchPacientes(); fetchEjercicios(); fetchAlertas(); }, []);

  const cerrarSesion = () => { localStorage.clear(); navigate('/login'); };

const marcarAlertaRevisada = async (ids_reportes) => {
    try { 
      await axios.patch(`http://localhost:3000/api/reportes/leido`, { ids_reportes }); 
      fetchAlertas(); 
    } catch (e) { console.error("Error al marcar alerta:", e); }
  };

  const handlePacienteSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:3000/api/pacientes', { email_fisio: correoFisioActual, ...pacienteData });
      setPacienteData({ nombre: '', telefono: '', diagnostico: '', email: '', password: '' });
      fetchPacientes();
      setMostrarFormulario(false);
      alert("Paciente registrado con éxito");
    } catch (error) { alert("Error al registrar paciente"); }
  };

  const handleAltaMedica = async (id_paciente) => {
    if (!window.confirm('¿Dictaminar alta médica?')) return;
    try { await axios.patch(`http://localhost:3000/api/pacientes/${id_paciente}/alta`); fetchPacientes(); setPacienteSeleccionado(null); } catch (e) {}
  };

  const abrirProgreso = async (paciente) => {
    setPacienteSeleccionado(paciente);
    try { const res = await axios.get(`http://localhost:3000/api/pacientes/${paciente.id_paciente}/progreso`); setDatosProgreso(res.data); } catch (e) { setDatosProgreso([]); }
  };

  const handleEjercicioSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:3000/api/ejercicios', ejercicioData);
      setEjercicioData({ nombre: '', descripcion: '', zona_cuerpo: '', url_imagen: '', url_video: '' });
      setMostrarFormEjercicio(false); fetchEjercicios(); alert("Ejercicio guardado");
    } catch (e) {}
  };

  const toggleDia = (dia) => {
    setPlanData({ ...planData, dias: planData.dias.includes(dia) ? planData.dias.filter(d => d !== dia) : [...planData.dias, dia] });
  };

  const handlePlanSubmit = async (e) => {
    e.preventDefault();
    if (planData.dias.length === 0 || !planData.id_ejercicio) return alert("Faltan datos en el plan");
    try {
      await axios.post('http://localhost:3000/api/planes', {
        id_paciente: pacienteParaPlan.id_paciente,
        plan_ejercicios: [{ id_ejercicio: planData.id_ejercicio, frecuencia_dias: planData.dias, fecha_inicio: planData.fecha_inicio, fecha_fin: planData.fecha_fin, series: parseInt(planData.series), repeticiones: parseInt(planData.repeticiones) }]
      });
      alert("¡Plan recetado con éxito!"); setPacienteParaPlan(null);
      setPlanData({ id_ejercicio: '', fecha_inicio: '', fecha_fin: '', series: 3, repeticiones: 10, dias: [] });
    } catch (e) { alert("Error al recetar el plan"); }
  };

  return (
    <div className="fisio-wrap">
      
      {/* Sidebar */}
      <aside className="fisio-sidebar">
        <h2>FisioNotes</h2>
        <span className="doc-name">{nombreFisioActual}</span>
        <nav className="sidebar-nav">
          <a onClick={() => setVistaActiva('pacientes')} className={`sidebar-link ${vistaActiva === 'pacientes' ? 'active' : ''}`}>
            <span>👥 Mis Pacientes</span>
            {alertas.length > 0 && <span className="badge">{alertas.length}</span>}
          </a>
          <a onClick={() => setVistaActiva('catalogo')} className={`sidebar-link ${vistaActiva === 'catalogo' ? 'active' : ''}`}>
            <span>🏋️ Catálogo</span>
          </a>
        </nav>
        <button onClick={cerrarSesion} className="btn btn-danger" style={{ marginTop: 'auto' }}>Salir del Sistema</button>
      </aside>

      {/* Contenido Principal */}
      <main className="fisio-main">
        
        {vistaActiva === 'pacientes' ? (
          <>
            <div className="header-section">
              <h1 style={{ margin: 0 }}>Panel de Pacientes</h1>
              <button onClick={() => setMostrarFormulario(!mostrarFormulario)} className="btn btn-success">
                {mostrarFormulario ? 'Cancelar Registro' : '+ Añadir Paciente'}
              </button>
            </div>

            {/* Alertas Críticas */}
            {alertas.length > 0 && (
              <div className="alert-box">
                <h3 style={{ margin: '0 0 10px 0', color: 'var(--danger)' }}>⚠️ Atención Requerida (Dolor &gt; 7)</h3>
                {alertas.map((alerta, index) => (
                  <div key={index} className="alert-item">
                    <p style={{ margin: 0, fontSize: '15px' }}>
                      🚨 Paciente: <strong style={{ color: 'var(--danger)', fontSize: '18px' }}>{alerta.paciente}</strong><br/>
                      Reportó dolor de <strong>{alerta.nivel_dolor}/10</strong> en: <em>{alerta.ejercicio}</em>.
                    </p>
                    {alerta.comentarios && <p style={{ margin: 0, fontStyle: 'italic', color: 'var(--text-muted)' }}>"{alerta.comentarios}"</p>}
                    
                    {/* AQUÍ LE ENVIAMOS TODOS LOS IDs DE ESE DÍA AL BOTÓN */}
                    <button onClick={() => marcarAlertaRevisada(alerta.ids_reportes)} className="btn btn-danger" style={{ alignSelf: 'flex-start' }}>✓ Marcar revisado</button>
                  </div>
                ))}
              </div>
            )}

            {/* Formulario Paciente */}
            {mostrarFormulario && (
              <div className="card-panel" style={{ borderLeft: '4px solid var(--success)' }}>
                <h3 style={{ marginTop: 0 }}>Registrar Nuevo Paciente</h3>
                <form onSubmit={handlePacienteSubmit} className="input-group">
                  <div className="input-row">
                    <input type="text" className="form-input" placeholder="Nombre completo" value={pacienteData.nombre} onChange={(e) => setPacienteData({...pacienteData, nombre: e.target.value})} required />
                    <input type="tel" className="form-input" placeholder="Teléfono" value={pacienteData.telefono} onChange={(e) => setPacienteData({...pacienteData, telefono: e.target.value})} required />
                  </div>
                  <div className="input-row">
                    <input type="email" className="form-input" placeholder="Correo electrónico" value={pacienteData.email} onChange={(e) => setPacienteData({...pacienteData, email: e.target.value})} required />
                    <input type="password" className="form-input" placeholder="Contraseña temporal" value={pacienteData.password} onChange={(e) => setPacienteData({...pacienteData, password: e.target.value})} required />
                  </div>
                  <textarea className="form-input" placeholder="Diagnóstico médico inicial" value={pacienteData.diagnostico} onChange={(e) => setPacienteData({...pacienteData, diagnostico: e.target.value})} required rows="2"></textarea>
                  <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>Guardar Expediente</button>
                </form>
              </div>
            )}

            {/* Tabla de Pacientes */}
            <div className="card-panel">
              {pacientes.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>No hay pacientes registrados.</p> : (
                <table className="styled-table">
                  <thead><tr><th>Nombre</th><th>Estado</th><th>Acciones Médicas</th></tr></thead>
                  <tbody>
                    {pacientes.map(p => (
                      <tr key={p.id_paciente}>
                        <td><strong>{p.nombre}</strong><br/><span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{p.email}</span></td>
                        <td>
                          <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold', backgroundColor: p.estado_tratamiento === 'RECUPERADO' ? '#D1FAE5' : '#FEF3C7', color: p.estado_tratamiento === 'RECUPERADO' ? '#065F46' : '#92400E' }}>
                            {p.estado_tratamiento === 'RECUPERADO' ? '✅ Alta' : '🏃‍♂️ Activo'}
                          </span>
                        </td>
                        <td style={{ display: 'flex', gap: '10px' }}>
                          <button onClick={() => abrirProgreso(p)} className="btn btn-primary">📊 Historial</button>
                          {p.estado_tratamiento !== 'RECUPERADO' && (
                            <button onClick={() => setPacienteParaPlan(p)} className="btn btn-purple">📝 Recetar</button>
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
            <div className="header-section">
              <div>
                <h1 style={{ margin: 0 }}>Catálogo de Ejercicios</h1>
                <p style={{ color: 'var(--text-muted)', margin: '5px 0 0 0' }}>Gestiona los ejercicios para tus planes de rehabilitación.</p>
              </div>
              <button onClick={() => setMostrarFormEjercicio(!mostrarFormEjercicio)} className="btn btn-success">
                {mostrarFormEjercicio ? 'Cancelar' : '+ Nuevo Ejercicio'}
              </button>
            </div>

            {mostrarFormEjercicio && (
              <div className="card-panel" style={{ borderLeft: '4px solid var(--success)' }}>
                <h3 style={{ marginTop: 0 }}>Detalles del Ejercicio</h3>
                <form onSubmit={handleEjercicioSubmit} className="input-group">
                  <div className="input-row">
                    <input type="text" className="form-input" placeholder="Nombre (ej. Elevación frontal)" value={ejercicioData.nombre} onChange={(e) => setEjercicioData({...ejercicioData, nombre: e.target.value})} required />
                    <input type="text" className="form-input" placeholder="Zona (ej. Hombro)" value={ejercicioData.zona_cuerpo} onChange={(e) => setEjercicioData({...ejercicioData, zona_cuerpo: e.target.value})} required />
                  </div>
                  <div className="input-row">
                    <input type="url" className="form-input" placeholder="URL de imagen (opcional)" value={ejercicioData.url_imagen} onChange={(e) => setEjercicioData({...ejercicioData, url_imagen: e.target.value})} />
                    <input type="url" className="form-input" placeholder="URL de YouTube (opcional)" value={ejercicioData.url_video} onChange={(e) => setEjercicioData({...ejercicioData, url_video: e.target.value})} />
                  </div>
                  <textarea className="form-input" placeholder="Descripción de la técnica correcta" value={ejercicioData.descripcion} onChange={(e) => setEjercicioData({...ejercicioData, descripcion: e.target.value})} required rows="2"></textarea>
                  <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>Guardar en Catálogo</button>
                </form>
              </div>
            )}

            <div className="catalogo-grid">
              {ejercicios.length === 0 ? <p>El catálogo está vacío.</p> : (
                ejercicios.map((ej) => (
                  <div key={ej.id_ejercicio} className="catalogo-card">
                    <div className="catalogo-img">
                      <img src={ej.url_imagen || 'https://via.placeholder.com/300x160?text=Sin+Imagen'} alt={ej.nombre} onError={(e) => { e.target.onerror = null; e.target.src = 'https://via.placeholder.com/300x160?text=Enlace+Roto'; }} />
                    </div>
                    <div className="catalogo-info">
                      <span className="tag-zona">{ej.zona_cuerpo}</span>
                      <h3 style={{ margin: '0 0 10px 0' }}>{ej.nombre}</h3>
                      <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)' }}>{ej.descripcion}</p>
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
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h2 style={{ margin: 0, color: '#8B5CF6' }}>Recetar Ejercicio: {pacienteParaPlan.nombre}</h2>
                <button onClick={() => setPacienteParaPlan(null)} className="btn-close">✖</button>
              </div>

              {ejercicios.length === 0 ? (
                <div className="alert-box" style={{ borderLeftColor: 'var(--warning)', backgroundColor: '#FFFBEB' }}>Aún no hay ejercicios en tu catálogo.</div>
              ) : (
                <form onSubmit={handlePlanSubmit} className="input-group">
                  <div>
                    <label className="form-label">1. Selecciona el Ejercicio</label>
                    <select required className="form-input" value={planData.id_ejercicio} onChange={(e) => setPlanData({...planData, id_ejercicio: e.target.value})}>
                      <option value="">-- Elige del Catálogo --</option>
                      {ejercicios.map(ej => <option key={ej.id_ejercicio} value={ej.id_ejercicio}>{ej.nombre} ({ej.zona_cuerpo})</option>)}
                    </select>
                  </div>
                  <div className="input-row">
                    <div>
                      <label className="form-label">Fecha de Inicio</label>
                      <input type="date" required className="form-input" value={planData.fecha_inicio} onChange={(e) => setPlanData({...planData, fecha_inicio: e.target.value})} />
                    </div>
                    <div>
                      <label className="form-label">Fecha de Fin</label>
                      <input type="date" required className="form-input" value={planData.fecha_fin} onChange={(e) => setPlanData({...planData, fecha_fin: e.target.value})} />
                    </div>
                  </div>
                  <div className="input-row">
                    <div>
                      <label className="form-label">Series</label>
                      <input type="number" min="1" required className="form-input" value={planData.series} onChange={(e) => setPlanData({...planData, series: e.target.value})} />
                    </div>
                    <div>
                      <label className="form-label">Repeticiones</label>
                      <input type="number" min="1" required className="form-input" value={planData.repeticiones} onChange={(e) => setPlanData({...planData, repeticiones: e.target.value})} />
                    </div>
                  </div>
                  <div>
                    <label className="form-label">¿Qué días debe hacerlo?</label>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      {[{n: 1, l: 'Lun'}, {n: 2, l: 'Mar'}, {n: 3, l: 'Mié'}, {n: 4, l: 'Jue'}, {n: 5, l: 'Vie'}, {n: 6, l: 'Sáb'}, {n: 0, l: 'Dom'}].map(dia => (
                        <button type="button" key={dia.n} onClick={() => toggleDia(dia.n)} className={`btn btn-outline ${planData.dias.includes(dia.n) ? 'selected' : ''}`} style={{ padding: '8px', minWidth: '45px' }}>{dia.l}</button>
                      ))}
                    </div>
                  </div>
                  <button type="submit" className="btn btn-purple" style={{ width: '100%', padding: '15px', marginTop: '10px' }}>Generar Agenda del Paciente</button>
                </form>
              )}
            </div>
          </div>
        )}

        {/* ==========================================
            MODAL: HISTORIAL DE PROGRESO
            ========================================== */}
        {pacienteSeleccionado && (
          <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '800px' }}>
              <div className="modal-header">
                <div>
                  <h2 style={{ margin: 0 }}>Historial: {pacienteSeleccionado.nombre}</h2>
                  <p style={{ margin: '5px 0 0 0', color: 'var(--text-muted)' }}>Diagnóstico: {pacienteSeleccionado.diagnostico}</p>
                </div>
                <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                  {pacienteSeleccionado.estado_tratamiento !== 'RECUPERADO' && (
                    <button onClick={() => handleAltaMedica(pacienteSeleccionado.id_paciente)} className="btn btn-success">🎉 Dictaminar Alta</button>
                  )}
                  <button onClick={() => setPacienteSeleccionado(null)} className="btn-close">✖</button>
                </div>
              </div>
              
              {datosProgreso.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', backgroundColor: '#F9FAFB', borderRadius: '8px' }}>Aún no hay reportes de dolor registrados.</div>
              ) : (
                <>
                  <div style={{ height: '300px', width: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={datosProgreso} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                        <XAxis dataKey="fecha" stroke="#6B7280" fontSize={12} />
                        <YAxis domain={[0, 10]} stroke="#6B7280" fontSize={12} />
                        <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
                        <Legend />
                        <Line type="monotone" dataKey="dolor" stroke="#EF4444" strokeWidth={3} name="Nivel de Dolor (1-10)" activeDot={{ r: 8 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="bitacora-container">
                    <h3 style={{ margin: '0 0 15px 0' }}>💬 Bitácora de Comentarios</h3>
                    <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                      {datosProgreso.filter(d => d.comentarios).length === 0 ? (
                        <p style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>Sin comentarios adicionales.</p>
                      ) : (
                        datosProgreso.filter(d => d.comentarios).map((d, i) => (
                          <div key={i} className="bitacora-item" style={{ borderLeftColor: d.dolor >= 8 ? 'var(--danger)' : 'var(--primary)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                              <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-muted)' }}>📅 {d.fecha}</span>
                              <span style={{ fontSize: '13px', fontWeight: 'bold', color: d.dolor >= 8 ? 'var(--danger)' : 'var(--primary)' }}>Dolor: {d.dolor}/10</span>
                            </div>
                            <p style={{ margin: 0, color: 'var(--text-main)', fontSize: '15px' }}>"{d.comentarios}"</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default FisioDashboard;