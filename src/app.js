const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const http = require('http');
require('dotenv').config();

const connectDB = require('./config/database');
const swaggerConfig = require('./config/swagger');
const errorHandler = require('./middleware/errorHandler');
const botLifecycleService = require('./services/botLifecycleService');
const websocketService = require('./services/websocketService');
const { createAdminUser } = require('./config/seeder');

// Importar rutas
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const botRoutes = require('./routes/botRoutes');
const messageRoutes = require('./routes/messageRoutes');
const apiInfoRoutes = require('./routes/apiInfoRoutes');

const app = express();

// Conectar a la base de datos
connectDB().then(() => {
  // Crear usuario administrador después de conectar a la BD
  createAdminUser();
});

// Middlewares
app.use(helmet());

// Configuración CORS - Permitir todas las solicitudes desde cualquier origen
app.use(cors({
  origin: true, // Permite cualquier origen
  credentials: true, // Permite cookies y credenciales
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'api_key'],
  exposedHeaders: ['Content-Length', 'X-Kuma-Revision'],
  maxAge: 86400 // Cache preflight por 24 horas
}));app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Configurar Swagger
swaggerConfig(app);

// Rutas
app.get('/', (req, res) => {
  res.json({
    message: 'Bienvenido a Unify Push API',
    version: '1.0.0',
    documentation: '/api-docs'
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/bots', botRoutes);
app.use('/api/bots', messageRoutes);
app.use('/api', apiInfoRoutes);

// Middleware de manejo de errores
app.use(errorHandler);

// Middleware para rutas no encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Ruta no encontrada',
    message: 'La ruta solicitada no existe'
  });
});

const PORT = process.env.PORT || 3000;

// Crear servidor HTTP
const server = http.createServer(app);

// Inicializar WebSocket service
websocketService.initialize(server);

server.listen(PORT, async () => {
  console.log(`🚀 Servidor ejecutándose en puerto ${PORT}`);
  console.log(`📚 Documentación disponible en http://localhost:${PORT}/api-docs`);
  console.log(`🔌 WebSocket disponible en ws://localhost:${PORT}`);
  
  // DEBUGGING: Limpiar todas las instancias al arrancar
  setTimeout(async () => {
    try {
      const whatsappService = require('./services/whatsappService');
      await whatsappService.clearAllInstances();
    } catch (error) {
      console.error('Error limpiando instancias:', error);
    }
  }, 1000);
  
  // TEMPORALMENTE DESHABILITADO: Inicializar bots conectados después de que el servidor esté listo
  console.log(`🚫 DEBUGGING: botLifecycleService DESHABILITADO temporalmente`);
  /*
  setTimeout(async () => {
    try {
      await botLifecycleService.initializeConnectedBots();
    } catch (error) {
      console.error('Error inicializando bots:', error);
    }
  }, 2000); // Esperar 2 segundos para que todo esté listo
  */
});

// Manejo de señales para cierre limpio
process.on('SIGINT', async () => {
  console.log('🛑 Recibida señal SIGINT, cerrando servidor...');
  await cleanupAndExit();
});

process.on('SIGTERM', async () => {
  console.log('🛑 Recibida señal SIGTERM, cerrando servidor...');
  await cleanupAndExit();
});

// Función para limpiar y salir
async function cleanupAndExit() {
  try {
    console.log('🧹 Limpiando instancias de WhatsApp...');
    
    // Importar whatsappService aquí para evitar dependencias circulares
    const whatsappService = require('./services/whatsappService');
    
    // Limpiar todas las instancias sin hacer logout
    const clients = whatsappService.clients;
    for (const [botId, client] of clients) {
      try {
        console.log(`🔄 Terminando cliente ${botId}...`);
        if (client.pupBrowser) {
          await client.pupBrowser.close();
        }
      } catch (error) {
        console.log(`⚠️ Error cerrando cliente ${botId}:`, error.message);
      }
    }
    
    console.log('✅ Limpieza completada');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error en limpieza:', error.message);
    process.exit(1);
  }
}

module.exports = app;