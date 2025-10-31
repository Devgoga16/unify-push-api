const Bot = require('../models/Bot');
const Message = require('../models/Message');
const whatsappService = require('../services/whatsappService');
const botLifecycleService = require('../services/botLifecycleService');
const websocketService = require('../services/websocketService');
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
    
    // Si no hay cliente en memoria, verificar si deberíamos conectarlo automáticamente
    if (!status.clientExists) {
      console.log(`❌ [API] Bot ${bot.name} sin cliente en memoria`);
      
      // Si el bot está marcado como conectado en BD pero no hay cliente, intentar reconectar automáticamente
      if (bot.status === 'connected') {
        console.log(`🔄 [API] Intentando reconexión automática del bot ${bot.name}...`);
        try {
          const connectResult = await whatsappService.createBotInstance(bot._id);
          console.log(`✅ [API] Reconexión automática exitosa para ${bot.name}`);
          
          // Esperar un poco para que se inicialice completamente
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          // Verificar nuevamente el estado
          const newStatus = whatsappService.getBotStatus(bot._id);
          if (newStatus.clientExists && newStatus.isReady) {
            console.log(`✅ [API] Bot ${bot.name} listo para envío después de reconexión automática`);
          } else {
            return res.status(400).json({
              success: false,
              error: 'Bot reconectado pero aún no está listo',
              message: 'El bot se está conectando. Intenta enviar el mensaje en unos segundos.',
              botStatus: bot.status,
              realTimeStatus: newStatus,
              botInfo: {
                name: bot.name,
                status: bot.status,
                phoneNumber: bot.phoneNumber
              }
            });
          }
        } catch (connectError) {
          console.error(`❌ [API] Error en reconexión automática de ${bot.name}:`, connectError.message);
          return res.status(400).json({
            success: false,
            error: 'Error reconectando el bot automáticamente',
            message: connectError.message,
            suggestion: 'Usa POST /api/bots/{id}/connect para conectar manualmente',
            botStatus: bot.status,
            botInfo: {
              name: bot.name,
              status: bot.status,
              phoneNumber: bot.phoneNumber
            }
          });
        }
      } else {
        // Bot no está marcado como conectado en BD
        return res.status(400).json({
          success: false,
          error: 'Bot no está conectado a WhatsApp',
          message: 'El bot debe estar conectado antes de enviar mensajes',
          suggestion: `Usa POST /api/bots/${bot._id}/connect para conectar el bot`,
          botStatus: bot.status,
          debug: 'Bot no conectado en base de datos',
          botInfo: {
            name: bot.name,
            status: bot.status,
            phoneNumber: bot.phoneNumber
          }
        });
      }
    }

    // Obtener el estado final (después de posible reconexión automática)
    const finalStatus = whatsappService.getBotStatus(bot._id);

    if (!finalStatus.isReady) {
      console.log(`⏳ [API] Bot ${bot.name} no está listo`);
      return res.status(400).json({
        success: false,
        error: 'Bot no está listo para enviar mensajes',
        botStatus: bot.status,
        debug: 'Cliente existe pero no está listo',
        realTimeStatus: finalStatus,
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

    // VERIFICAR Y CORREGIR INCONSISTENCIAS AUTOMÁTICAMENTE
    console.log(`🔍 Verificando estado del bot ${bot.name} (${bot._id})`);
    const statusCheck = await botLifecycleService.verifyAndFixBotStatus(bot._id);
    
    // Recargar el bot actualizado después de la verificación
    const updatedBot = await Bot.findById(bot._id);
    
    const realTimeStatus = whatsappService.getBotStatus(bot._id);
    
    console.log(`📊 [API] Estado del bot ${bot.name} (${bot._id}):`, {
      database: updatedBot.status,
      realTime: realTimeStatus,
      statusCheck: statusCheck
    });

    // EMITIR EVENTO WEBSOCKET: Estado del bot actualizado
    websocketService.emitBotStatusUpdate(bot._id, {
      database: {
        status: updatedBot.status,
        phoneNumber: updatedBot.phoneNumber,
        lastActivity: updatedBot.lastActivity,
        qrCode: updatedBot.qrCode ? true : false
      },
      realTime: realTimeStatus,
      isReady: realTimeStatus.connected && realTimeStatus.isReady
    });

    res.status(200).json({
      success: true,
      data: {
        id: updatedBot._id,
        name: updatedBot.name,
        status: updatedBot.status,
        phoneNumber: updatedBot.phoneNumber,
        lastActivity: updatedBot.lastActivity,
        createdAt: updatedBot.createdAt,
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
        },
        statusCheck: statusCheck // Información sobre la verificación realizada
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