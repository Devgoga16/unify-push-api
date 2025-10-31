const jwt = require('jsonwebtoken');
const Bot = require('../models/Bot');

class WebSocketService {
  constructor() {
    this.io = null;
    this.connectedClients = new Map(); // userId -> Set of socketIds
    this.botRooms = new Map(); // botId -> Set of socketIds
  }

  // Inicializar Socket.IO con el servidor HTTP
  initialize(server) {
    const { Server } = require('socket.io');
    this.io = new Server(server, {
      cors: {
        origin: true, // Permite cualquier origen para WebSockets
        methods: ["GET", "POST"],
        credentials: true
      },
      // Configuración de ping/heartbeat para evitar desconexiones
      pingTimeout: 60000, // 60 segundos para ping timeout
      pingInterval: 25000, // 25 segundos entre pings
      connectTimeout: 20000, // 20 segundos para timeout de conexión inicial
      // Permitir reconexión automática
      allowEIO3: true,
      transports: ['websocket', 'polling']
    });

    this.setupSocketHandlers();
    console.log('🚀 WebSocket service initialized with ping config');
  }

  // Configurar manejadores de eventos de socket
  setupSocketHandlers() {
    this.io.use(async (socket, next) => {
      try {
        // Autenticación JWT desde handshake
        const token = socket.handshake.auth.token;
        if (!token) {
          console.error('❌ WebSocket: No token provided');
          return next(new Error('Authentication token required'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = decoded.id;
        socket.userRole = decoded.role;
        socket.username = decoded.username;

        console.log(`🔐 WebSocket auth successful for ${socket.username}`);
        next();
      } catch (error) {
        console.error('❌ WebSocket authentication error:', error.message);
        next(new Error('Authentication failed'));
      }
    });

    this.io.on('connection', (socket) => {
      console.log(`🔌 User ${socket.username} (${socket.userId}) connected via WebSocket`);

      // Registrar cliente conectado
      this.registerClient(socket.userId, socket.id);

      // Evento: Unirse a room de bot específico
      socket.on('join-bot-room', async (botId) => {
        try {
          // Verificar permisos del bot
          const hasAccess = await this.checkBotAccess(socket.userId, socket.userRole, botId);
          if (!hasAccess) {
            socket.emit('error', { message: 'No tienes acceso a este bot' });
            return;
          }

          socket.join(`bot_${botId}`);
          this.registerBotRoom(botId, socket.id);

          console.log(`👤 User ${socket.username} joined bot room: ${botId}`);

          // Enviar estado actual del bot
          const botStatus = await this.getBotCurrentStatus(botId);
          socket.emit('bot-status-update', {
            botId,
            ...botStatus
          });

        } catch (error) {
          console.error('Error joining bot room:', error);
          socket.emit('error', { message: 'Error al unirse a la sala del bot' });
        }
      });

      // Evento: Salir de room de bot
      socket.on('leave-bot-room', (botId) => {
        socket.leave(`bot_${botId}`);
        this.unregisterBotRoom(botId, socket.id);
        console.log(`👤 User ${socket.username} left bot room: ${botId}`);
      });

      // Evento: Solicitar estado de bot
      socket.on('request-bot-status', async (botId) => {
        try {
          const hasAccess = await this.checkBotAccess(socket.userId, socket.userRole, botId);
          if (!hasAccess) {
            socket.emit('error', { message: 'No tienes acceso a este bot' });
            return;
          }

          const botStatus = await this.getBotCurrentStatus(botId);
          socket.emit('bot-status-update', {
            botId,
            ...botStatus
          });
        } catch (error) {
          socket.emit('error', { message: 'Error obteniendo estado del bot' });
        }
      });

      // Evento: Ping para mantener conexión
      socket.on('ping', () => {
        socket.emit('pong');
      });

      // Evento: Error en socket
      socket.on('error', (error) => {
        console.error(`❌ WebSocket error for user ${socket.username}:`, error);
      });

      // Desconexión
      socket.on('disconnect', (reason) => {
        console.log(`🔌 User ${socket.username} (${socket.userId}) disconnected. Reason: ${reason}`);
        this.unregisterClient(socket.userId, socket.id);

        // Limpiar rooms de bots
        this.botRooms.forEach((sockets, botId) => {
          if (sockets.has(socket.id)) {
            sockets.delete(socket.id);
            console.log(`🧹 Cleaned up socket ${socket.id} from bot room ${botId}`);
          }
        });
      });
    });
  }

  // Registrar cliente conectado
  registerClient(userId, socketId) {
    if (!this.connectedClients.has(userId)) {
      this.connectedClients.set(userId, new Set());
    }
    this.connectedClients.get(userId).add(socketId);
  }

  // Desregistrar cliente
  unregisterClient(userId, socketId) {
    if (this.connectedClients.has(userId)) {
      this.connectedClients.get(userId).delete(socketId);
      if (this.connectedClients.get(userId).size === 0) {
        this.connectedClients.delete(userId);
      }
    }
  }

  // Registrar socket en room de bot
  registerBotRoom(botId, socketId) {
    if (!this.botRooms.has(botId)) {
      this.botRooms.set(botId, new Set());
    }
    this.botRooms.get(botId).add(socketId);
  }

  // Desregistrar socket de room de bot
  unregisterBotRoom(botId, socketId) {
    if (this.botRooms.has(botId)) {
      this.botRooms.get(botId).delete(socketId);
      if (this.botRooms.get(botId).size === 0) {
        this.botRooms.delete(botId);
      }
    }
  }

  // Verificar acceso a bot
  async checkBotAccess(userId, userRole, botId) {
    try {
      if (userRole === 'admin') {
        return true;
      }

      const bot = await Bot.findOne({ _id: botId, owner: userId });
      return !!bot;
    } catch (error) {
      console.error('Error checking bot access:', error);
      return false;
    }
  }

  // Obtener estado actual del bot
  async getBotCurrentStatus(botId) {
    try {
      const Bot = require('../models/Bot');
      const whatsappService = require('./whatsappService');

      const bot = await Bot.findById(botId);
      if (!bot) {
        throw new Error('Bot no encontrado');
      }

      const realTimeStatus = whatsappService.getBotStatus(botId);

      return {
        database: {
          status: bot.status,
          phoneNumber: bot.phoneNumber,
          lastActivity: bot.lastActivity,
          qrCode: bot.qrCode ? true : false // No enviar el QR completo por seguridad
        },
        realTime: realTimeStatus,
        isReady: realTimeStatus.connected && realTimeStatus.isReady,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting bot status:', error);
      return {
        error: true,
        message: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // EMITIR EVENTOS A CLIENTES CONECTADOS

  // Emitir actualización de estado de bot
  emitBotStatusUpdate(botId, statusData) {
    if (this.io) {
      this.io.to(`bot_${botId}`).emit('bot-status-update', {
        botId,
        ...statusData,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Emitir cuando se genera QR
  emitBotQRGenerated(botId, qrCode) {
    if (this.io) {
      this.io.to(`bot_${botId}`).emit('bot-qr-generated', {
        botId,
        qrCode,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Emitir cuando bot se conecta
  emitBotConnected(botId, phoneNumber) {
    if (this.io) {
      this.io.to(`bot_${botId}`).emit('bot-connected', {
        botId,
        phoneNumber,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Emitir cuando bot se desconecta
  emitBotDisconnected(botId, reason) {
    if (this.io) {
      this.io.to(`bot_${botId}`).emit('bot-disconnected', {
        botId,
        reason,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Emitir cuando bot es eliminado
  emitBotDeleted(botId) {
    if (this.io) {
      this.io.to(`bot_${botId}`).emit('bot-deleted', {
        botId,
        timestamp: new Date().toISOString()
      });
      // También emitir a todos los usuarios conectados para actualizar listas
      this.io.emit('bot-removed', {
        botId,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Emitir error de bot
  emitBotError(botId, error) {
    if (this.io) {
      this.io.to(`bot_${botId}`).emit('bot-error', {
        botId,
        error: error.message || error,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Emitir cuando se envía mensaje
  emitMessageSent(botId, messageData) {
    if (this.io) {
      this.io.to(`bot_${botId}`).emit('message-sent', {
        botId,
        ...messageData,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Emitir log de actividad
  emitBotLog(botId, level, message, data = {}) {
    if (this.io) {
      this.io.to(`bot_${botId}`).emit('bot-log', {
        botId,
        level, // 'info', 'warn', 'error'
        message,
        data,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Emitir estadísticas actualizadas
  emitBotStatsUpdate(botId, stats) {
    if (this.io) {
      this.io.to(`bot_${botId}`).emit('bot-stats-update', {
        botId,
        stats,
        timestamp: new Date().toISOString()
      });
    }
  }

  // MÉTODOS DE DEBUGGING

  // Obtener estadísticas de conexiones
  getConnectionStats() {
    return {
      connectedUsers: this.connectedClients.size,
      totalSockets: Array.from(this.connectedClients.values()).reduce((sum, sockets) => sum + sockets.size, 0),
      activeBotRooms: this.botRooms.size,
      rooms: Array.from(this.botRooms.entries()).map(([botId, sockets]) => ({
        botId,
        connectedSockets: sockets.size
      }))
    };
  }

  // Listar clientes conectados (para debugging)
  listConnectedClients() {
    console.log('🔍 Connected WebSocket clients:');
    this.connectedClients.forEach((sockets, userId) => {
      console.log(`  User ${userId}: ${sockets.size} socket(s)`);
    });
  }

  // Listar rooms de bots (para debugging)
  listBotRooms() {
    console.log('🔍 Active bot rooms:');
    this.botRooms.forEach((sockets, botId) => {
      console.log(`  Bot ${botId}: ${sockets.size} socket(s)`);
    });
  }
}

module.exports = new WebSocketService();