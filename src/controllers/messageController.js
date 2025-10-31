const Bot = require('../models/Bot');
const whatsappService = require('../services/whatsappService');
const { validationResult } = require('express-validator');

// Enviar mensaje usando API Key en header y bot ID en URL
const sendMessage = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Datos de entrada inválidos',
        details: errors.array()
      });
    }

    const { botId } = req.params;
    const { to, message } = req.body;
    const bot = req.bot; // Bot ya validado por el middleware de API Key

    // Verificar que el bot ID coincida con el bot autenticado
    if (bot._id.toString() !== botId) {
      return res.status(403).json({
        success: false,
        error: 'Bot ID no coincide con la API Key',
        message: 'El bot ID en la URL no corresponde a la API Key proporcionada'
      });
    }

    // Verificar si el bot está conectado
    const status = whatsappService.getBotStatus(bot._id);
    console.log(`🔍 [API] Estado del bot ${bot.name} (${bot._id}) para envío:`, status);
    console.log(`📞 [API] Enviando mensaje a ${to}: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}"`);
    
    if (!status.clientExists) {
      console.log(`❌ [API] Bot ${bot.name} sin cliente en memoria`);
      return res.status(400).json({
        success: false,
        error: 'Bot no está conectado a WhatsApp',
        botStatus: bot.status,
        debug: 'No hay cliente en memoria',
        botInfo: {
          name: bot.name,
          status: bot.status,
          phoneNumber: bot.phoneNumber
        }
      });
    }

    if (!status.isReady) {
      console.log(`⏳ [API] Bot ${bot.name} no está listo`);
      return res.status(400).json({
        success: false,
        error: 'Bot no está listo para enviar mensajes',
        botStatus: bot.status,
        debug: 'Cliente existe pero no está listo',
        botInfo: {
          name: bot.name,
          status: bot.status,
          phoneNumber: bot.phoneNumber
        }
      });
    }

    // Enviar mensaje
    const result = await whatsappService.sendMessage(bot._id, to, message);
    
    console.log(`✅ [API] Mensaje enviado exitosamente desde ${bot.name} a ${to}`);

    res.status(200).json({
      success: true,
      data: {
        messageId: result.messageId,
        message: result.message,
        timestamp: new Date().toISOString(),
        bot: {
          id: bot._id,
          name: bot.name,
          phoneNumber: bot.phoneNumber
        },
        recipient: to,
        sentAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error(`❌ [API] Error enviando mensaje desde bot ${req.bot?.name}:`, error.message);
    
    if (error.message.includes('Bot no está conectado') || 
        error.message.includes('Bot no está listo')) {
      return res.status(400).json({
        success: false,
        error: error.message,
        botInfo: {
          name: req.bot?.name,
          status: req.bot?.status,
          phoneNumber: req.bot?.phoneNumber
        }
      });
    }
    next(error);
  }
};

// Obtener estado del bot por bot ID y API Key en header
const getBotStatus = async (req, res, next) => {
  try {
    const { botId } = req.params;
    const bot = req.bot; // Bot ya validado por el middleware de API Key

    // Verificar que el bot ID coincida con el bot autenticado
    if (bot._id.toString() !== botId) {
      return res.status(403).json({
        success: false,
        error: 'Bot ID no coincide con la API Key',
        message: 'El bot ID en la URL no corresponde a la API Key proporcionada'
      });
    }

    const realTimeStatus = whatsappService.getBotStatus(bot._id);
    
    console.log(`📊 [API] Consultando estado del bot ${bot.name} (${bot._id})`);

    res.status(200).json({
      success: true,
      data: {
        id: bot._id,
        name: bot.name,
        status: bot.status,
        phoneNumber: bot.phoneNumber,
        lastActivity: bot.lastActivity,
        createdAt: bot.createdAt,
        realTimeStatus: {
          connected: realTimeStatus.connected,
          clientExists: realTimeStatus.clientExists,
          isReady: realTimeStatus.isReady,
          status: realTimeStatus.status,
          phoneNumber: realTimeStatus.phoneNumber
        },
        isReady: realTimeStatus.connected && realTimeStatus.isReady,
        capabilities: {
          sendMessages: realTimeStatus.connected && realTimeStatus.isReady,
          receiveMessages: realTimeStatus.connected,
          sendMedia: realTimeStatus.connected && realTimeStatus.isReady,
          groupMessages: realTimeStatus.connected && realTimeStatus.isReady
        }
      }
    });

  } catch (error) {
    console.error(`❌ [API] Error obteniendo estado del bot:`, error.message);
    next(error);
  }
};

// MANTENER LA FUNCIÓN ANTIGUA PARA COMPATIBILIDAD
const getBotStatusByApiKey = async (req, res, next) => {
  try {
    const { apiKey } = req.params;

    const bot = await Bot.findOne({ 
      apiKey: apiKey,
      isActive: true 
    }).select('name status phoneNumber lastActivity');

    if (!bot) {
      return res.status(404).json({
        success: false,
        error: 'API Key inválida o bot inactivo'
      });
    }

    const realTimeStatus = whatsappService.getBotStatus(bot._id);

    res.status(200).json({
      success: true,
      data: {
        name: bot.name,
        status: bot.status,
        phoneNumber: bot.phoneNumber,
        lastActivity: bot.lastActivity,
        realTimeStatus: realTimeStatus,
        isReady: realTimeStatus.connected
      }
    });

  } catch (error) {
    next(error);
  }
};

module.exports = {
  sendMessage,
  getBotStatus,
  getBotStatusByApiKey  // Mantener para compatibilidad
};