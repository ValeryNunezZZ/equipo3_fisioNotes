const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

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

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});