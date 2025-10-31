const Bot = require('../models/Bot');
const Message = require('../models/Message');
const whatsappService = require('../services/whatsappService');
const botLifecycleService = require('../services/botLifecycleService');
const sessionCleanupService = require('../services/sessionCleanupService');
const websocketService = require('../services/websocketService');
const { validationResult } = require('express-validator');

// Función auxiliar para verificar acceso a bot (admin puede acceder a cualquier bot)
const findBotWithAccess = async (botId, user) => {
  if (user.role === 'admin') {
    // Admin puede acceder a cualquier bot
    return await Bot.findById(botId).populate('owner', 'name username');
  } else {
    // Usuario normal solo sus propios bots
    return await Bot.findOne({ 
      _id: botId,
      owner: user._id 
    });
  }
};

// Crear nuevo bot
const createBot = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Datos de entrada inválidos',
        details: errors.array()
      });
    }

    // Crear bot asociado al usuario autenticado
    const bot = await Bot.create({
      ...req.body,
      owner: req.user._id
    });

    // NO inicializar WhatsApp automáticamente
    // El usuario deberá conectar el bot manualmente
    console.log(`✅ Bot ${bot.name} creado exitosamente (${bot._id}) - WhatsApp no conectado`);

    res.status(201).json({
      success: true,
      data: {
        ...bot.toObject(),
        endpointUrl: bot.getEndpointUrl()
      },
      message: 'Bot creado exitosamente. Usa el endpoint /connect para conectar WhatsApp.'
    });
  } catch (error) {
    next(error);
  }
};

// Obtener todos los bots del usuario (o todos si es admin)
const getUserBots = async (req, res, next) => {
  try {
    console.log(`🚨 DEBUGGING: getUserBots llamado para usuario: ${req.user.username} (rol: ${req.user.role})`);
    
    // Verificar instancias activas
    whatsappService.listActiveInstances();
    
    let bots;
    
    // Si es admin, obtener todos los bots del sistema
    if (req.user.role === 'admin') {
      console.log(`👑 Usuario admin - Obteniendo TODOS los bots del sistema`);
      bots = await Bot.find({}).populate('owner', 'name username').sort({ createdAt: -1 });
    } else {
      // Si es usuario normal, solo sus bots
      console.log(`👤 Usuario normal - Obteniendo solo sus bots`);
      bots = await Bot.find({ owner: req.user._id }).sort({ createdAt: -1 });
    }
    
    // Agregar endpoint URL, información del propietario y ESTADO EN TIEMPO REAL
    const botsWithEndpoint = bots.map(bot => {
      const realTimeStatus = whatsappService.getBotStatus(bot._id);
      
      return {
        ...bot.toObject(),
        endpointUrl: bot.getEndpointUrl(),
        // ESTADO EN TIEMPO REAL - ¡Esto faltaba!
        realTimeStatus: realTimeStatus,
        isReady: realTimeStatus.connected && realTimeStatus.isReady,
        // Si es admin, incluir información del propietario
        ...(req.user.role === 'admin' && {
          ownerInfo: bot.owner ? {
            id: bot.owner._id,
            name: bot.owner.name,
            username: bot.owner.username
          } : null
        })
      };
    });

    // EMITIR EVENTOS WEBSOCKET: Estado actual de todos los bots listados
    // Esto permite que el frontend mantenga el estado sincronizado en tiempo real
    botsWithEndpoint.forEach(bot => {
      const realTimeStatus = whatsappService.getBotStatus(bot._id);
      websocketService.emitBotStatusUpdate(bot._id, {
        database: {
          status: bot.status,
          phoneNumber: bot.phoneNumber,
          lastActivity: bot.lastActivity,
          qrCode: bot.qrCode ? true : false
        },
        realTime: realTimeStatus,
        isReady: realTimeStatus.connected && realTimeStatus.isReady
      });
    });

    console.log(`✅ DEBUGGING: getUserBots completado - ${botsWithEndpoint.length} bots encontrados`);

    res.status(200).json({
      success: true,
      count: botsWithEndpoint.length,
      data: botsWithEndpoint,
      // Indicar si se están viendo todos los bots (admin) o solo los propios
      scope: req.user.role === 'admin' ? 'all_bots' : 'user_bots'
    });
  } catch (error) {
    next(error);
  }
};

// Forzar actualización de estado de todos los bots (para detectar cambios directos en BD)
const refreshAllBots = async (req, res, next) => {
  try {
    console.log(`🔄 REFRESH: Forzando actualización de estado para usuario: ${req.user.username} (${req.user.role})`);
    
    let bots;
    
    // Si es admin, obtener todos los bots del sistema
    if (req.user.role === 'admin') {
      console.log(`👑 REFRESH: Admin forzando actualización de TODOS los bots del sistema`);
      bots = await Bot.find({}).populate('owner', 'name username').sort({ createdAt: -1 });
    } else {
      // Si es usuario normal, solo sus bots
      console.log(`👤 REFRESH: Usuario forzando actualización de sus bots`);
      bots = await Bot.find({ owner: req.user._id }).sort({ createdAt: -1 });
    }
    
    // Agregar endpoint URL y estado en tiempo real
    const botsWithStatus = bots.map(bot => {
      const realTimeStatus = whatsappService.getBotStatus(bot._id);
      
      return {
        ...bot.toObject(),
        endpointUrl: bot.getEndpointUrl(),
        realTimeStatus: realTimeStatus,
        isReady: realTimeStatus.connected && realTimeStatus.isReady,
        // Si es admin, incluir información del propietario
        ...(req.user.role === 'admin' && {
          ownerInfo: bot.owner ? {
            id: bot.owner._id,
            name: bot.owner.name,
            username: bot.owner.username
          } : null
        })
      };
    });

    // EMITIR EVENTOS WEBSOCKET: Forzar actualización en TODOS los clientes conectados
    botsWithStatus.forEach(bot => {
      const realTimeStatus = whatsappService.getBotStatus(bot._id);
      websocketService.emitBotStatusUpdate(bot._id, {
        database: {
          status: bot.status,
          phoneNumber: bot.phoneNumber,
          lastActivity: bot.lastActivity,
          qrCode: bot.qrCode ? true : false
        },
        realTime: realTimeStatus,
        isReady: realTimeStatus.connected && realTimeStatus.isReady
      });
    });

    console.log(`✅ REFRESH: Actualización forzada completada - ${botsWithStatus.length} bots actualizados`);

    res.status(200).json({
      success: true,
      message: 'Estado de bots actualizado y notificado a todos los clientes conectados',
      count: botsWithStatus.length,
      data: botsWithStatus,
      scope: req.user.role === 'admin' ? 'all_bots' : 'user_bots'
    });
  } catch (error) {
    next(error);
  }
};

// Obtener bot por ID (admin puede ver cualquier bot)
const getBotById = async (req, res, next) => {
  try {
    let bot;
    
    // Si es admin, puede ver cualquier bot
    if (req.user.role === 'admin') {
      console.log(`👑 Admin accediendo a bot ${req.params.id}`);
      bot = await Bot.findById(req.params.id).populate('owner', 'name username');
    } else {
      // Usuario normal solo puede ver sus propios bots
      bot = await Bot.findOne({ 
        _id: req.params.id,
        owner: req.user._id 
      });
    }
    
    if (!bot) {
      return res.status(404).json({
        success: false,
        error: 'Bot no encontrado'
      });
    }

    // Si el bot está marcado como conectado pero no tiene instancia en memoria
    if (bot.status === 'connected') {
      const status = whatsappService.getBotStatus(bot._id);
      if (!status.clientExists) {
        console.log(`⚠️ Bot ${bot._id} conectado en BD pero sin instancia en memoria`);
        console.log(`📋 Para reconectar, usa el endpoint POST /api/bots/${bot._id}/restart`);
        // NO reconectar automáticamente para evitar errores EBUSY
        // La reconexión debe ser manual del usuario
      }
    }

    const response = {
      ...bot.toObject(),
      endpointUrl: bot.getEndpointUrl()
    };

    // Si es admin y el bot tiene propietario, incluir info del propietario
    if (req.user.role === 'admin' && bot.owner) {
      response.ownerInfo = {
        id: bot.owner._id,
        name: bot.owner.name,
        username: bot.owner.username
      };
    }

    // EMITIR EVENTO WEBSOCKET: Estado actual del bot consultado
    const realTimeStatus = whatsappService.getBotStatus(bot._id);
    websocketService.emitBotStatusUpdate(bot._id, {
      database: {
        status: bot.status,
        phoneNumber: bot.phoneNumber,
        lastActivity: bot.lastActivity,
        qrCode: bot.qrCode ? true : false
      },
      realTime: realTimeStatus,
      isReady: realTimeStatus.connected && realTimeStatus.isReady
    });

    res.status(200).json({
      success: true,
      data: response
    });
  } catch (error) {
    next(error);
  }
};

// Obtener QR code de un bot (admin puede acceder a cualquier bot)
const getBotQR = async (req, res, next) => {
  try {
    console.log(`📱 Solicitando QR para bot: ${req.params.id} (usuario: ${req.user.username}, rol: ${req.user.role})`);
    
    const bot = await findBotWithAccess(req.params.id, req.user);
    
    if (!bot) {
      console.log(`❌ Bot no encontrado: ${req.params.id}`);
      return res.status(404).json({
        success: false,
        error: 'Bot no encontrado'
      });
    }

    // Si el bot ya está conectado
    if (bot.status === 'connected') {
      return res.status(200).json({
        success: true,
        message: 'Bot ya está conectado',
        data: {
          status: bot.status,
          phoneNumber: bot.phoneNumber
        }
      });
    }

    // Obtener QR del servicio o de la base de datos
    const qrFromService = whatsappService.getBotQR(bot._id);
    const qrCode = qrFromService || bot.qrCode;

    if (!qrCode) {
      return res.status(404).json({
        success: false,
        error: 'QR code no disponible. El bot puede estar inicializándose.',
        suggestion: 'Intenta nuevamente en unos segundos'
      });
    }

    const imageUrl = `/api/bots/${bot._id}/qr-image`;
    const publicImageUrl = `/api/bots/${bot._id}/qr-public`;
    console.log(`✅ QR disponible para bot ${bot._id}`);

    res.status(200).json({
      success: true,
      data: {
        qrCode: qrCode,
        status: bot.status,
        message: 'Escanea este código QR con WhatsApp Web',
        imageUrl: imageUrl,
        publicImageUrl: publicImageUrl
      }
    });
  } catch (error) {
    console.error(`❌ Error obteniendo QR para bot ${req.params.id}:`, error.message);
    next(error);
  }
};

// Obtener código QR del bot como imagen PNG (admin puede acceder a cualquier bot)
const getBotQRImage = async (req, res, next) => {
  try {
    console.log(`🖼️ Solicitando imagen QR para bot: ${req.params.id} (usuario: ${req.user.username}, rol: ${req.user.role})`);
    
    const bot = await findBotWithAccess(req.params.id, req.user);
    
    if (!bot) {
      console.log(`❌ Bot no encontrado o sin acceso: ${req.params.id}`);
      return res.status(404).json({
        success: false,
        error: 'Bot no encontrado'
      });
    }

    // Si el bot ya está conectado, no necesita QR
    if (bot.status === 'connected') {
      return res.status(400).json({
        success: false,
        error: 'Bot ya está conectado, no necesita QR'
      });
    }

    // Obtener QR del servicio o de la base de datos
    const qrFromService = whatsappService.getBotQR(bot._id);
    const qrCode = qrFromService || bot.qrCode;
    
    console.log(`🔍 QR disponible para bot ${bot._id}: ${!!qrCode}`);
    
    if (!qrCode) {
      return res.status(404).json({
        success: false,
        error: 'Código QR no disponible. Intenta obtenerlo primero con GET /api/bots/:id/qr'
      });
    }

    // Convertir base64 a buffer
    const base64Data = qrCode.replace('data:image/png;base64,', '');
    const qrBuffer = Buffer.from(base64Data, 'base64');
    
    console.log(`✅ Enviando imagen QR para bot ${bot._id}, tamaño: ${qrBuffer.length} bytes`);
    
    // Establecer headers para imagen
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Length', qrBuffer.length);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    // Enviar la imagen
    res.send(qrBuffer);

  } catch (error) {
    console.error(`❌ Error obteniendo imagen QR para bot ${req.params.id}:`, error.message);
    next(error);
  }
};

// Obtener código QR del bot como imagen PNG (público - para demostración en Swagger)
const getBotQRImagePublic = async (req, res, next) => {
  try {
    console.log(`🖼️ [PÚBLICO] Solicitando imagen QR para bot: ${req.params.id}`);
    
    const bot = await Bot.findById(req.params.id);
    
    if (!bot) {
      console.log(`❌ Bot no encontrado: ${req.params.id}`);
      return res.status(404).json({
        success: false,
        error: 'Bot no encontrado'
      });
    }

    // Si el bot ya está conectado, no necesita QR
    if (bot.status === 'connected') {
      return res.status(400).json({
        success: false,
        error: 'Bot ya está conectado, no necesita QR'
      });
    }

    // Obtener QR del servicio o de la base de datos
    const qrFromService = whatsappService.getBotQR(bot._id);
    const qrCode = qrFromService || bot.qrCode;
    
    console.log(`🔍 [PÚBLICO] QR disponible para bot ${bot._id}: ${!!qrCode}`);
    
    if (!qrCode) {
      return res.status(404).json({
        success: false,
        error: 'Código QR no disponible'
      });
    }

    // Convertir base64 a buffer
    const base64Data = qrCode.replace('data:image/png;base64,', '');
    const qrBuffer = Buffer.from(base64Data, 'base64');
    
    console.log(`✅ [PÚBLICO] Enviando imagen QR para bot ${bot._id}, tamaño: ${qrBuffer.length} bytes`);
    
    // Establecer headers para imagen
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Length', qrBuffer.length);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    // Enviar la imagen
    res.send(qrBuffer);

  } catch (error) {
    console.error(`❌ Error obteniendo imagen QR pública para bot ${req.params.id}:`, error.message);
    next(error);
  }
};

// Reiniciar bot (generar nuevo QR) - admin puede reiniciar cualquier bot
const restartBot = async (req, res, next) => {
  try {
    const bot = await findBotWithAccess(req.params.id, req.user);
    
    if (!bot) {
      return res.status(404).json({
        success: false,
        error: 'Bot no encontrado'
      });
    }

    console.log(`🔄 Reiniciando bot ${bot.name} (${bot._id}) - Usuario: ${req.user.username} (${req.user.role})`);
    const result = await whatsappService.restartBot(bot._id);

    // EMITIR EVENTO WEBSOCKET: Estado actualizado después del reinicio
    const realTimeStatus = whatsappService.getBotStatus(bot._id);
    websocketService.emitBotStatusUpdate(bot._id, {
      database: {
        status: bot.status,
        phoneNumber: bot.phoneNumber,
        lastActivity: bot.lastActivity,
        qrCode: bot.qrCode ? true : false
      },
      realTime: realTimeStatus,
      isReady: realTimeStatus.connected && realTimeStatus.isReady
    });

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// Conectar bot a WhatsApp (admin puede conectar cualquier bot)
const connectBot = async (req, res, next) => {
  try {
    const bot = await findBotWithAccess(req.params.id, req.user);
    
    if (!bot) {
      return res.status(404).json({
        success: false,
        error: 'Bot no encontrado'
      });
    }

    console.log(`🚀 Conectando bot ${bot.name} (${bot._id}) a WhatsApp - Usuario: ${req.user.username} (${req.user.role})`);
    const result = await whatsappService.createBotInstance(bot._id);

    // EMITIR EVENTO WEBSOCKET: Estado actualizado después de iniciar conexión
    const realTimeStatus = whatsappService.getBotStatus(bot._id);
    websocketService.emitBotStatusUpdate(bot._id, {
      database: {
        status: bot.status,
        phoneNumber: bot.phoneNumber,
        lastActivity: bot.lastActivity,
        qrCode: bot.qrCode ? true : false
      },
      realTime: realTimeStatus,
      isReady: realTimeStatus.connected && realTimeStatus.isReady
    });

    res.status(200).json({
      success: true,
      data: result,
      message: 'Bot conectándose a WhatsApp. El QR code estará disponible en unos segundos.'
    });
  } catch (error) {
    console.error('Error conectando bot:', error);
    next(error);
  }
};

// Desconectar bot de WhatsApp (admin puede desconectar cualquier bot)
const disconnectBot = async (req, res, next) => {
  try {
    const bot = await findBotWithAccess(req.params.id, req.user);
    
    if (!bot) {
      return res.status(404).json({
        success: false,
        error: 'Bot no encontrado'
      });
    }

    console.log(`🔌 Desconectando bot ${bot.name} (${bot._id}) - LIMPIEZA COMPLETA - Usuario: ${req.user.username} (${req.user.role})`);
    
    // Usar el método nuclear para limpiar completamente
    await whatsappService.nukeSession(bot._id);
    
    // Limpiar memoria también
    whatsappService.clearBotFromMemory(bot._id);

    // Actualizar estado en BD
    await Bot.findByIdAndUpdate(bot._id, { 
      status: 'disconnected',
      qrCode: null,
      phoneNumber: null 
    });

    // EMITIR EVENTO WEBSOCKET: Estado actualizado después de desconectar
    const realTimeStatus = whatsappService.getBotStatus(bot._id);
    websocketService.emitBotStatusUpdate(bot._id, {
      database: {
        status: 'disconnected',
        phoneNumber: null,
        lastActivity: bot.lastActivity,
        qrCode: false
      },
      realTime: realTimeStatus,
      isReady: false
    });

    res.status(200).json({
      success: true,
      message: 'Bot desconectado completamente - empezará de cero en próxima conexión'
    });
  } catch (error) {
    console.error('Error desconectando bot:', error);
    next(error);
  }
};

// Actualizar bot
const updateBot = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Datos de entrada inválidos',
        details: errors.array()
      });
    }

    const bot = await Bot.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!bot) {
      return res.status(404).json({
        success: false,
        error: 'Bot no encontrado'
      });
    }

    // EMITIR EVENTO WEBSOCKET: Estado actualizado después de actualizar bot
    const realTimeStatus = whatsappService.getBotStatus(bot._id);
    websocketService.emitBotStatusUpdate(bot._id, {
      database: {
        status: bot.status,
        phoneNumber: bot.phoneNumber,
        lastActivity: bot.lastActivity,
        qrCode: bot.qrCode ? true : false
      },
      realTime: realTimeStatus,
      isReady: realTimeStatus.connected && realTimeStatus.isReady
    });
    
    res.status(200).json({
      success: true,
      data: {
        ...bot.toObject(),
        endpointUrl: bot.getEndpointUrl()
      }
    });
  } catch (error) {
    next(error);
  }
};

// Eliminar bot
const deleteBot = async (req, res, next) => {
  try {
    const bot = await Bot.findOne({ 
      _id: req.params.id,
      owner: req.user._id 
    });
    
    if (!bot) {
      return res.status(404).json({
        success: false,
        error: 'Bot no encontrado'
      });
    }

    // Destruir instancia de WhatsApp
    try {
      await whatsappService.destroyBotInstance(bot._id);
    } catch (whatsappError) {
      console.error('Error destruyendo instancia WhatsApp:', whatsappError);
    }

    // Eliminar bot
    await Bot.findByIdAndDelete(bot._id);

    // EMITIR EVENTO WEBSOCKET: Bot eliminado
    websocketService.emitBotDeleted(bot._id);
    
    res.status(200).json({
      success: true,
      message: 'Bot eliminado correctamente'
    });
  } catch (error) {
    next(error);
  }
};

// Regenerar API Key
const regenerateApiKey = async (req, res, next) => {
  try {
    const bot = await Bot.findOne({ 
      _id: req.params.id,
      owner: req.user._id 
    });
    
    if (!bot) {
      return res.status(404).json({
        success: false,
        error: 'Bot no encontrado'
      });
    }

    await bot.regenerateApiKey();

    res.status(200).json({
      success: true,
      data: {
        apiKey: bot.apiKey,
        endpointUrl: bot.getEndpointUrl(),
        message: 'API Key regenerada exitosamente'
      }
    });
  } catch (error) {
    next(error);
  }
};

// Obtener historial de mensajes de un bot
const getBotMessages = async (req, res, next) => {
  try {
    const bot = await Bot.findOne({ 
      _id: req.params.id,
      owner: req.user._id 
    });
    
    if (!bot) {
      return res.status(404).json({
        success: false,
        error: 'Bot no encontrado'
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const messages = await Message.find({ bot: bot._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Message.countDocuments({ bot: bot._id });

    res.status(200).json({
      success: true,
      data: messages,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

// Verificar y corregir estado del bot
const verifyBotStatus = async (req, res, next) => {
  try {
    const bot = await Bot.findOne({ 
      _id: req.params.id,
      owner: req.user._id 
    });
    
    if (!bot) {
      return res.status(404).json({
        success: false,
        error: 'Bot no encontrado'
      });
    }

    const result = await botLifecycleService.verifyAndFixBotStatus(bot._id);

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// Limpiar sesiones corruptas (endpoint de emergencia)
const cleanupSessions = async (req, res, next) => {
  try {
    await sessionCleanupService.cleanupLockedSessions();
    
    res.json({
      success: true,
      message: 'Limpieza de sesiones completada'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createBot,
  getUserBots,
  refreshAllBots,
  getBotById,
  getBotQR,
  getBotQRImage,
  getBotQRImagePublic,
  restartBot,
  updateBot,
  deleteBot,
  connectBot,
  disconnectBot,
  regenerateApiKey,
  getBotMessages,
  cleanupSessions
};