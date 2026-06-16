const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const crypto = require('crypto');

// Llave de 32 caracteres (256 bits) para el algoritmo AES-256
const AES_SECRET = process.env.AES_SECRET || 'FisioNotesSecretoSuperSeguro1234'; 

// Función para cifrar el diagnóstico (RNF-01)
function encriptarAES(texto) {
  const iv = crypto.randomBytes(16); // Vector de inicialización
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(AES_SECRET), iv);
  let encriptado = cipher.update(texto, 'utf8', 'hex');
  encriptado += cipher.final('hex');
  return iv.toString('hex') + ':' + encriptado; // Guardamos el IV y el texto cifrado
}

// Función para descifrar el diagnóstico (RNF-01)
function desencriptarAES(textoCifrado) {
  try {
    const textParts = textoCifrado.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(AES_SECRET), iv);
    let desencriptado = decipher.update(encryptedText);
    desencriptado = Buffer.concat([desencriptado, decipher.final()]);
    return desencriptado.toString();
  } catch (error) {
    console.error("Error al descifrar:", error);
    return "Error de lectura de datos protegidos";
  }
}

const app = express();
const prisma = new PrismaClient(); // Iniciamos la conexión a la base de datos
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// Ruta de prueba para verificar que el servidor vive
app.get('/api/status', (req, res) => {
  res.json({ message: '¡API de FisioNotes funcionando correctamente!' });
});

// -------------------------------------------------------------
// ENDPOINT: RF-02 Registro de Fisioterapeutas (Boceto inicial)
// -------------------------------------------------------------
app.post('/api/fisioterapeutas', async (req, res) => {
  try {
    const { nombre, correo, cedula } = req.body;

    // 1. Verificar si el correo ya existe
    const usuarioExistente = await prisma.usuario.findUnique({
      where: { email: correo }
    });

    if (usuarioExistente) {
      return res.status(400).json({ error: 'El correo ya está registrado.' });
    }

    // 2. Crear el Usuario (con rol FISIO) y su PerfilFisio al mismo tiempo
    const nuevoFisio = await prisma.usuario.create({
      data: {
        email: correo,
        rol: 'FISIO',
        perfilFisio: {
          create: {
            nombre_completo: nombre,
            cedula_profesional: cedula
          }
        }
      },
      include: {
        perfilFisio: true // Para que la respuesta incluya los datos del perfil
      }
    });

    res.status(201).json({ 
      message: 'Fisioterapeuta registrado con éxito', 
      data: nuevoFisio 
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno del servidor al registrar.' });
  }
});


// -------------------------------------------------------------
// ENDPOINT TEMPORAL: Crear el Administrador Maestro
// (Solo lo usaremos una vez para tener con quién iniciar sesión)
// -------------------------------------------------------------
app.get('/api/setup-admin', async (req, res) => {
  try {
    const adminEmail = 'admin@fisionotes.com';
    const adminExiste = await prisma.usuario.findUnique({ where: { email: adminEmail } });
    
    if (adminExiste) {
      return res.json({ message: 'El administrador ya existe.' });
    }

    // Encriptamos la contraseña "admin123"
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    const nuevoAdmin = await prisma.usuario.create({
      data: {
        email: adminEmail,
        password: hashedPassword,
        rol: 'ADMIN' // Cumpliendo con el REG-01
      }
    });

    res.status(201).json({ message: 'Administrador creado con éxito', data: nuevoAdmin });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear el administrador' });
  }
});

// -------------------------------------------------------------
// ENDPOINT: RF-01 Inicio de Sesión
// -------------------------------------------------------------
app.post('/api/login', async (req, res) => {
  try {
    const { correo, password } = req.body;

    // 1. Buscamos al usuario incluyendo SOLO su perfil de Fisio
    const usuario = await prisma.usuario.findUnique({ 
      where: { email: correo },
      include: {
        perfilFisio: true // Quitamos perfilPaciente porque no es una relación directa aquí
      }
    });

    if (!usuario || !usuario.password) {
      return res.status(401).json({ error: 'Usuario o contraseña inválidos' });
    }

    // 2. Verificamos que la contraseña coincida
    const passwordValido = await bcrypt.compare(password, usuario.password);
    if (!passwordValido) {
      return res.status(401).json({ error: 'Usuario o contraseña inválidos' });
    }

    // 3. Identificamos el nombre real del usuario sin romper la base de datos
    let nombreUsuario = 'Administrador';
    if (usuario.rol === 'FISIO' && usuario.perfilFisio) {
      nombreUsuario = usuario.perfilFisio.nombre_completo;
    } else if (usuario.rol === 'PACIENTE') {
      nombreUsuario = 'Paciente'; // Lo dejamos genérico porque su nombre real vive dentro de la lista del doctor
    }

    // 4. Generamos el token JWT
    const token = jwt.sign(
      { id_usuario: usuario.id_usuario, rol: usuario.rol },
      process.env.JWT_SECRET || 'secreto_super_seguro_fisionotes',
      { expiresIn: '30m' }
    );

    res.json({
      message: 'Inicio de sesión exitoso',
      token: token,
      rol: usuario.rol,
      nombre: nombreUsuario
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// -------------------------------------------------------------
// ENDPOINT: Simulación de Activación de Cuenta (Parte del RF-03)
// -------------------------------------------------------------
app.post('/api/activar-cuenta', async (req, res) => {
  try {
    const { correo, nuevaPassword } = req.body;

    // 1. Buscamos al usuario
    const usuario = await prisma.usuario.findUnique({ 
      where: { email: correo } 
    });

    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // 2. Encriptamos la nueva contraseña
    const hashedPassword = await bcrypt.hash(nuevaPassword, 10);

    // 3. Guardamos la contraseña en la tabla Usuario
    await prisma.usuario.update({
      where: { email: correo },
      data: { password: hashedPassword }
    });

    // 4. Cambiamos el estado de activación en su PerfilFisio a true
    await prisma.perfilFisio.update({
      where: { id_usuario: usuario.id_usuario },
      data: { estado_activacion: true }
    });

    res.json({ message: 'Cuenta activada y contraseña configurada con éxito' });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno del servidor al activar cuenta' });
  }
});

// -------------------------------------------------------------
// ENDPOINT: Registrar Paciente y crear su cuenta de acceso
// -------------------------------------------------------------
app.post('/api/pacientes', async (req, res) => {
  try {
    const { email_fisio, nombre, telefono, diagnostico, email, password } = req.body;

    // 1. Validar que el correo del paciente no exista en la tabla de logins
    const usuarioExistente = await prisma.usuario.findUnique({
      where: { email: email }
    });

    if (usuarioExistente) {
      return res.status(400).json({ error: 'Este correo ya pertenece a otra cuenta.' });
    }

    // 2. Encriptar la contraseña del paciente
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // 3. Crear el acceso de Login (Usuario)
    await prisma.usuario.create({
      data: {
        email: email,
        password: hashedPassword,
        rol: 'PACIENTE'
      }
    });

    // 4. Crear el expediente clínico y asignarlo al Fisioterapeuta
    // Usamos una actualización anidada para no tener que adivinar el nombre de la llave foránea
    await prisma.usuario.update({
      where: { email: email_fisio },
      data: {
        perfilFisio: {
          update: {
            pacientes: {
              create: {
                nombre: nombre,
                telefono: telefono,
                email: email,
                // RNF-01: Ciframos el diagnóstico antes de guardarlo en Neon
                diagnostico: encriptarAES(diagnostico) 
              }
            }
          }
        }
      }
    });

    res.status(201).json({ message: 'Paciente registrado y cuenta de acceso generada con éxito.' });

  } catch (error) {
    console.error("Error al registrar paciente:", error);
    res.status(500).json({ error: 'Error interno al registrar al paciente.' });
  }
});

// -------------------------------------------------------------
// ENDPOINT: Obtener la lista de pacientes de un Fisioterapeuta
// -------------------------------------------------------------
app.get('/api/pacientes/:email_fisio', async (req, res) => {
  try {
    const { email_fisio } = req.params;

    // Buscamos al fisio y le pedimos a Prisma que incluya su lista de pacientes
    const usuario = await prisma.usuario.findUnique({
      where: { email: email_fisio },
      include: { 
        perfilFisio: { 
          include: { pacientes: true } 
        } 
      }
    });

    if (!usuario || !usuario.perfilFisio) {
      return res.status(404).json({ error: 'Fisioterapeuta no encontrado' });
    }

    // Recorremos la lista de pacientes y desciframos el diagnóstico de cada uno
    const pacientesDescifrados = usuario.perfilFisio.pacientes.map(paciente => ({
      ...paciente,
      diagnostico: desencriptarAES(paciente.diagnostico)
    }));

    res.json(pacientesDescifrados);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno al obtener los pacientes' });
  }
});

// -------------------------------------------------------------
// ENDPOINTS: RF-05 Gestión del Catálogo de Ejercicios
// -------------------------------------------------------------

// 1. Agregar un nuevo ejercicio al catálogo
app.post('/api/ejercicios', async (req, res) => {
  try {
    const { nombre, descripcion, zona_cuerpo, url_imagen } = req.body;

    const nuevoEjercicio = await prisma.catalogoEjercicio.create({
      data: {
        nombre,
        descripcion,
        zona_cuerpo,
        url_imagen
      }
    });

    res.status(201).json({ 
      message: 'Ejercicio agregado al catálogo con éxito', 
      data: nuevoEjercicio 
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno al guardar el ejercicio' });
  }
});

// 2. Obtener la lista completa de ejercicios
app.get('/api/ejercicios', async (req, res) => {
  try {
    // findMany() trae todos los registros de la tabla
    const catalogo = await prisma.catalogoEjercicio.findMany();
    res.json(catalogo);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener el catálogo' });
  }
});

// -------------------------------------------------------------
// ENDPOINT: RF-06 y RF-07 Crear Plan y Generar Agenda Automática
// -------------------------------------------------------------
// -------------------------------------------------------------
// ENDPOINT: RF-06 y RF-07 Crear Plan y Generar Agenda Automática
// -------------------------------------------------------------
app.post('/api/planes', async (req, res) => {
  try {
    const { id_paciente, plan_ejercicios } = req.body;

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0); // Inicio del día exacto en tu computadora

    for (const ej of plan_ejercicios) {
      
      // 🛠️ CORRECCIÓN: Separar el string para obligar a JS a usar la zona local
      const [year, month, day] = ej.fecha_inicio.split('-');
      const fechaInicio = new Date(year, month - 1, day); // Meses en JS van de 0 a 11

      // REG-06: Validar que no sea en el pasado real
      if (fechaInicio < hoy) {
        return res.status(400).json({ error: 'La fecha de inicio no puede ser en el pasado.' });
      }
      
      if (!ej.series || ej.series <= 0 || !ej.repeticiones || ej.repeticiones <= 0) {
        return res.status(400).json({ error: 'Series y repeticiones mayores a cero (REG-05).' });
      }
    }

    await prisma.$transaction(async (tx) => {
      for (const ej of plan_ejercicios) {
        
        // Convertimos las fechas de forma segura
        const [y1, m1, d1] = ej.fecha_inicio.split('-');
        const fechaInicio = new Date(y1, m1 - 1, d1);

        const [y2, m2, d2] = ej.fecha_fin.split('-');
        const fechaFin = new Date(y2, m2 - 1, d2);

        await tx.planEjercicio.create({
          data: {
            id_paciente: id_paciente,
            id_ejercicio: ej.id_ejercicio,
            frecuencia_dias: ej.frecuencia_dias,
            fecha_inicio: fechaInicio,
            fecha_fin: fechaFin,
            series: ej.series,
            repeticiones: ej.repeticiones
          }
        });

        let fechaActual = new Date(fechaInicio);

        // Bucle while: Recorre día a día
        while (fechaActual <= fechaFin) {
          const diaSemana = fechaActual.getDay(); 
          
          if (ej.frecuencia_dias.includes(diaSemana)) {
            await tx.agendaDiaria.create({
              data: {
                id_paciente: id_paciente,
                fecha: new Date(fechaActual), // Guarda la fecha con la hora local correcta
                id_ejercicio: ej.id_ejercicio
              }
            });
          }
          fechaActual.setDate(fechaActual.getDate() + 1);
        }
      }
    });

    res.status(201).json({ message: 'Plan de tratamiento y agenda diaria generados con éxito' });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno al generar el plan y la agenda' });
  }
});

// -------------------------------------------------------------
// ENDPOINT: RF-07 Agenda Diaria del Paciente (Hoy)
// -------------------------------------------------------------
// -------------------------------------------------------------
// ENDPOINT: RF-07 Agenda Diaria del Paciente (Hoy)
// -------------------------------------------------------------
app.get('/api/agenda/:id_paciente/hoy', async (req, res) => {
  try {
    const { id_paciente } = req.params;

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0); 
    
    const manana = new Date(hoy);
    manana.setDate(manana.getDate() + 1); 

    const agendaCruda = await prisma.agendaDiaria.findMany({
      where: {
        id_paciente: id_paciente,
        fecha: {
          gte: hoy,    
          lt: manana   
        }
      },
      include: {
        ejercicio: true 
      }
    });

    // 🛠️ FILTRO ANTI-DUPLICADOS: 
    // Comparamos los IDs de los ejercicios. Si el doctor lo recetó 
    // dos veces para el mismo día por error, solo mostramos uno.
    const agendaSinDuplicados = agendaCruda.filter((item, index, self) =>
      index === self.findIndex((t) => t.id_ejercicio === item.id_ejercicio)
    );

    res.json(agendaSinDuplicados);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener la agenda de hoy' });
  }
});
// -------------------------------------------------------------
// ENDPOINTS: RF-11 Registro Diario de Estado y Cierre
// -------------------------------------------------------------

// 1. Actualizar si un ejercicio fue completado o no
app.patch('/api/agenda/:id_agenda/completar', async (req, res) => {
  try {
    const { id_agenda } = req.params;
    const { estado_completado } = req.body;

    const agendaActualizada = await prisma.agendaDiaria.update({
      where: { id_agenda: id_agenda },
      data: { estado_completado: estado_completado }
    });

    res.json({ message: 'Estado del ejercicio actualizado', data: agendaActualizada });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar el ejercicio' });
  }
});

// 2. Guardar el reporte de dolor al terminar la rutina (VERSIÓN MEJORADA CON UPSERT)
app.post('/api/reportes', async (req, res) => {
  try {
    const { agendaIds, nivel_dolor, comentarios } = req.body;

    // Validación estricta del documento: El dolor se mide del 1 al 10
    if (nivel_dolor < 1 || nivel_dolor > 10) {
      return res.status(400).json({ error: 'El nivel de dolor debe estar entre 1 y 10' });
    }

    // Usamos una transacción con "upsert" (actualizar si existe, crear si no existe)
    await prisma.$transaction(
      agendaIds.map((id) => 
        prisma.reporteEstado.upsert({
          where: { id_agenda: id },
          update: {
            nivel_dolor: parseInt(nivel_dolor),
            comentarios: comentarios
          },
          create: {
            id_agenda: id,
            nivel_dolor: parseInt(nivel_dolor),
            comentarios: comentarios
          }
        })
      )
    );

    res.status(201).json({ message: '¡Rutina terminada con éxito y reporte guardado!' });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno al guardar el reporte' });
  }
});

// -------------------------------------------------------------
// ENDPOINT: RF-09 y REG-11 Alertas Críticas por Dolor
// -------------------------------------------------------------
app.get('/api/alertas/:email_fisio', async (req, res) => {
  try {
    const { email_fisio } = req.params;

    // Buscamos al fisio y anidamos la búsqueda hasta llegar a los reportes de estado
    const usuario = await prisma.usuario.findUnique({
      where: { email: email_fisio },
      include: {
        perfilFisio: {
          include: {
            pacientes: {
              include: {
                agendaDiaria: {
                  include: {
                    // Filtramos SOLO los reportes con dolor mayor a 7 y no leídos
                    reporteEstado: {
                      where: {
                        nivel_dolor: { gt: 7 },
                        leido: false
                      }
                    },
                    ejercicio: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!usuario || !usuario.perfilFisio) {
      return res.status(404).json({ error: 'Fisioterapeuta no encontrado' });
    }

    // Aplanamos la información para entregarle al Frontend un arreglo limpio de alertas
    let alertasCriticas = [];
    
    usuario.perfilFisio.pacientes.forEach(paciente => {
      paciente.agendaDiaria.forEach(agenda => {
        // Como filtramos desde Prisma, si existe reporteEstado aquí, es porque el dolor es > 7
        if (agenda.reporteEstado) {
          alertasCriticas.push({
            id_reporte: agenda.reporteEstado.id_reporte,
            paciente: paciente.nombre,
            ejercicio: agenda.ejercicio.nombre,
            nivel_dolor: agenda.reporteEstado.nivel_dolor,
            comentarios: agenda.reporteEstado.comentarios,
            fecha: agenda.reporteEstado.fecha_reporte
          });
        }
      });
    });

    res.json(alertasCriticas);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener las alertas críticas' });
  }
});

// -------------------------------------------------------------
// ENDPOINT: Marcar alerta de dolor como leída
// -------------------------------------------------------------
app.patch('/api/reportes/:id_reporte/leido', async (req, res) => {
  try {
    const { id_reporte } = req.params;

    await prisma.reporteEstado.update({
      where: { id_reporte: id_reporte }, // <-- QUITAMOS EL parseInt() AQUÍ
      data: { leido: true }
    });

    res.json({ message: 'Alerta marcada como revisada' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar el reporte' });
  }
});

// -------------------------------------------------------------
// ENDPOINT: RF-08 Monitoreo de Progreso (VERSIÓN DIRECTA Y ROBUSTA)
// -------------------------------------------------------------
app.get('/api/pacientes/:id_paciente/progreso', async (req, res) => {
  try {
    const { id_paciente } = req.params;

    // 1. Buscamos directo en la AgendaDiaria del paciente
    const agendaConReportes = await prisma.agendaDiaria.findMany({
      where: {
        id_paciente: id_paciente,
        // Solo traemos los días que SÍ tienen un reporte guardado
        reporteEstado: { isNot: null } 
      },
      include: {
        ejercicio: true,
        reporteEstado: true
      }
    });

    // 2. Transformamos la información de forma segura
    const datosGrafica = agendaConReportes.map(agenda => {
      // Usamos un bloque try-catch interno por si el formato de la fecha de la BD es distinto
      let fechaFormateada = "Sin Fecha";
      try {
        const fechaCruda = agenda.reporteEstado.fecha_reporte || new Date();
        fechaFormateada = new Date(fechaCruda).toISOString().split('T')[0];
      } catch (e) {
        console.log("Aviso: Formato de fecha inusual en el reporte", agenda.reporteEstado.id_reporte);
      }

      return {
        fecha: fechaFormateada,
        dolor: agenda.reporteEstado.nivel_dolor,
        ejercicio: agenda.ejercicio.nombre,
        comentarios: agenda.reporteEstado.comentarios
      };
    });

    // 3. Ordenamos cronológicamente (del más antiguo al más reciente)
    datosGrafica.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

    res.json(datosGrafica);

  } catch (error) {
    console.error("Error crítico al procesar progreso:", error);
    res.status(500).json({ error: 'Error al obtener el historial de progreso' });
  }
});

// -------------------------------------------------------------
// ENDPOINT: Registro de Personal (Fisioterapeutas vía Admin)
// -------------------------------------------------------------
app.post('/api/registro', async (req, res) => {
  try {
    const { nombre, email, password, cedula } = req.body;

    // 1. Validar si el correo ya existe
    const usuarioExistente = await prisma.usuario.findUnique({
      where: { email: email }
    });

    if (usuarioExistente) {
      return res.status(400).json({ error: 'Este correo ya está registrado en el sistema.' });
    }

    // 2. Encriptar la contraseña por seguridad (Hash)
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // 3. Crear el Usuario y su Perfil de Fisioterapeuta al mismo tiempo
    const nuevoFisio = await prisma.usuario.create({
      data: {
        email: email,
        password: hashedPassword, // <-- CORREGIDO AQUÍ TAMBIÉN PARA EL ADMIN
        rol: 'FISIO',
        perfilFisio: {
          create: {
            nombre_completo: nombre,
            cedula_profesional: cedula
          }
        }
      }
    });

    res.status(201).json({ message: '¡Cuenta de fisioterapeuta creada con éxito!' });

  } catch (error) {
    console.error("Error en registro:", error);
    res.status(500).json({ error: 'Error interno al registrar la cuenta.' });
  }
});

// -------------------------------------------------------------
// ENDPOINT: RF-10 Dictaminar Alta Médica (Cierre de Tratamiento)
// -------------------------------------------------------------
app.patch('/api/pacientes/:id_paciente/alta', async (req, res) => {
  try {
    const { id_paciente } = req.params;
    const fechaActual = new Date();

    // 1. Actualizamos el estado del paciente y guardamos la fecha de alta
    const pacienteActualizado = await prisma.paciente.update({
      where: { id_paciente: id_paciente },
      data: {
        estado_tratamiento: 'RECUPERADO',
        fecha_alta: fechaActual
      }
    });

    // 2. Lógica de limpieza: Eliminamos de la agenda todos los ejercicios 
    // que estaban programados para fechas POSTERIORES al día de hoy, 
    // ya que el tratamiento ha concluido exitosamente.
    await prisma.agendaDiaria.deleteMany({
      where: {
        id_paciente: id_paciente,
        fecha: {
          gt: fechaActual // gt = greater than (mayor que)
        }
      }
    });

    res.json({ 
      message: '¡Paciente dado de alta exitosamente!', 
      data: pacienteActualizado 
    });

  } catch (error) {
    console.error("Error al dar de alta al paciente:", error);
    res.status(500).json({ error: 'Error interno al procesar el alta médica' });
  }
});

// -------------------------------------------------------------
// ENDPOINT: Obtener Perfil del Paciente (Para su Tablero)
// -------------------------------------------------------------
app.get('/api/paciente/perfil/:email', async (req, res) => {
  try {
    const { email } = req.params;
    
    // Buscamos el expediente clínico usando el correo del Login
    const paciente = await prisma.paciente.findUnique({
      where: { email: email }
    });

    if (!paciente) {
      return res.status(404).json({ error: 'Expediente clínico no encontrado' });
    }

    // Le devolvemos al frontend justo lo que necesita para arrancar
    res.json({
      id_paciente: paciente.id_paciente,
      nombre: paciente.nombre,
      estado_tratamiento: paciente.estado_tratamiento
    });

  } catch (error) {
    console.error("Error al obtener perfil del paciente:", error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});