const whatsappService = require('../services/whatsappService');
const Bot = require('../models/Bot');

// Servicio para manejar el ciclo de vida de los bots
class BotLifecycleService {
  
  // Inicializar verificación de bots al arrancar el servidor
  async initializeConnectedBots() {
    try {
      console.log('🔄 Verificando estado de bots...');
      
      // Primero limpiar sesiones huérfanas
      await whatsappService.cleanOrphanSessions();
      
      // Buscar todos los bots que estaban conectados
      const connectedBots = await Bot.find({ 
        status: 'connected',
        isActive: true 
      });

      // NO reconectar automáticamente para evitar errores EBUSY
      // Solo marcar como desconectados para que el usuario los reactive manualmente
      for (const bot of connectedBots) {
        try {
          console.log(`📋 Bot encontrado: ${bot.name} (${bot._id}) - Marcando como desconectado`);
          console.log(`🔄 Para reconectar, usa: POST /api/bots/${bot._id}/connect`);
          
          // Marcar como desconectado para reconexión manual
          await Bot.findByIdAndUpdate(bot._id, { 
            status: 'disconnected',
            qrCode: null 
          });
        } catch (error) {
          console.error(`❌ Error actualizando estado del bot ${bot._id}:`, error.message);
        }
      }

      console.log(`✅ Verificación completada. ${connectedBots.length} bots marcados para reconexión manual.`);
      console.log(`💡 Para conectar un bot, usa: POST /api/bots/{id}/connect`);
      
    } catch (error) {
      console.error('❌ Error en verificación de bots:', error);
    }
  }

  // Verificar y corregir inconsistencias de estado
  async verifyAndFixBotStatus(botId) {
    try {
      const bot = await Bot.findById(botId);
      if (!bot) return null;

      // Verificación profunda del estado
      const realTimeStatus = whatsappService.getBotStatus(botId);
      const connectionVerification = await whatsappService.verifyBotConnection(botId);
      
      console.log(`🔍 Verificando bot ${botId}:`);
      console.log(`  - DB Status: ${bot.status}`);
      console.log(`  - Real Time: ${JSON.stringify(realTimeStatus)}`);
      console.log(`  - Connection: ${JSON.stringify(connectionVerification)}`);
      
      // Si el bot está marcado como conectado pero no lo está realmente
      if (bot.status === 'connected' && !connectionVerification.connected) {
        console.log(`🔧 Detectada inconsistencia en bot ${botId}. Motivo: ${connectionVerification.reason}`);
        
        // NO reconectar automáticamente - dejar que el usuario use /connect
        console.log(`❌ Marcando bot ${botId} como desconectado. Use POST /api/bots/${botId}/connect para reconectar.`);
        
        try {
          // Solo marcar como desconectado
          await Bot.findByIdAndUpdate(botId, { 
            status: 'disconnected',
            qrCode: null 
          });
          
          return {
            fixed: true,
            message: 'Bot marcado como desconectado - use /connect para reconectar',
            details: connectionVerification
          };
        } catch (error) {
          console.error(`Error actualizando estado del bot ${botId}:`, error);
          return {
            error: true,
            message: error.message
          };
        }
      }

      return {
        consistent: true,
        message: 'Estado consistente',
        details: connectionVerification
      };

    } catch (error) {
      console.error(`Error verificando bot ${botId}:`, error);
      return {
        error: true,
        message: error.message
      };
    }
  }

  // Obtener estado unificado del bot
  async getUnifiedBotStatus(botId) {
    try {
      const bot = await Bot.findById(botId);
      if (!bot) throw new Error('Bot no encontrado');

      const realTimeStatus = whatsappService.getBotStatus(botId);
      
      // Verificar inconsistencias automáticamente
      const statusCheck = await this.verifyAndFixBotStatus(botId);
      
      return {
        bot: {
          id: bot._id,
          name: bot.name,
          apiKey: bot.apiKey,
          phoneNumber: bot.phoneNumber,
          lastActivity: bot.lastActivity
        },
        status: {
          database: bot.status,
          realTime: realTimeStatus,
          isConsistent: statusCheck.consistent || statusCheck.fixed,
          isReady: realTimeStatus.connected && bot.status === 'connected',
          lastCheck: new Date()
        },
        statusCheck: statusCheck
      };

    } catch (error) {
      throw error;
    }
  }

  // Limpiar bots inactivos (opcional)
  async cleanupInactiveBots() {
    try {
      const inactiveBots = await Bot.find({
        $or: [
          { status: 'disconnected' },
          { status: 'error' }
        ],
        lastActivity: {
          $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 horas
        }
      });

      for (const bot of inactiveBots) {
        // Limpiar instancia si existe
        try {
          await whatsappService.destroyBotInstance(bot._id);
        } catch (error) {
          // Ignorar errores de limpieza
        }
      }

      console.log(`🧹 Limpieza completada. ${inactiveBots.length} bots inactivos procesados.`);
      
    } catch (error) {
      console.error('Error en limpieza:', error);
    }
  }
}

module.exports = new BotLifecycleService();
module.exports = new BotLifecycleService();