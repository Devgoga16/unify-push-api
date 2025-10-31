const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const mongoose = require('mongoose');
const fs = require('fs').promises;
const path = require('path');
const Bot = require('../models/Bot');
const Message = require('../models/Message');
const websocketService = require('./websocketService');

class WhatsAppService {
  constructor() {
    this.clients = new Map(); // Almacenar múltiples clientes
    this.qrCodes = new Map(); // Almacenar QR codes temporalmente
    this.creationMutex = new Map(); // Mutex para evitar creaciones simultáneas
    this.disconnectedIntentionally = new Set(); // Bots desconectados intencionalmente
  }

  // Crear nueva instancia de WhatsApp para un bot
  async createBotInstance(botId) {
    const botIdString = botId.toString();
    let resolveMutex;
    
    // Log detallado para debugging
    console.log(`🚨 DEBUGGING: createBotInstance llamado para bot ${botIdString}`);
    console.log(`📍 Stack trace:`, new Error().stack);
    
    // Verificar si el bot fue desconectado intencionalmente
    if (this.disconnectedIntentionally.has(botIdString)) {
      console.log(`🚫 Bot ${botIdString} fue desconectado intencionalmente - Permitiendo nueva conexión manual`);
      this.disconnectedIntentionally.delete(botIdString); // Limpiar la bandera
    }
    
    try {
      // Verificar si ya hay una creación en progreso para este bot
      if (this.creationMutex.has(botIdString)) {
        console.log(`⚠️ Creación de bot ${botIdString} ya en progreso. Esperando...`);
        // Esperar a que termine la creación en progreso
        await this.creationMutex.get(botIdString);
        
        // Si ya existe el cliente después de esperar, retornarlo
        if (this.clients.has(botIdString)) {
          console.log(`✅ Bot ${botIdString} ya creado por otro proceso`);
          return {
            success: true,
            message: 'Bot ya inicializado por otro proceso'
          };
        }
      }
      
      // Crear promesa para el mutex
      const mutexPromise = new Promise(resolve => {
        resolveMutex = resolve;
      });
      this.creationMutex.set(botIdString, mutexPromise);
      
      console.log(`🔧 Iniciando creación de bot ${botIdString}...`);
      
      const bot = await Bot.findById(botIdString);
      if (!bot) {
        throw new Error('Bot no encontrado');
      }

      // Si ya existe un cliente, destruirlo primero
      if (this.clients.has(botIdString)) {
        console.log(`🔄 Destruyendo cliente existente para bot ${botIdString}...`);
        await this.destroyBotInstance(botIdString);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      console.log(`🚀 Creando nueva instancia WhatsApp para bot ${botIdString}...`);

      const client = new Client({
        authStrategy: new LocalAuth({
          clientId: `bot_${botIdString}`,
          dataPath: './.wwebjs_auth'
        }),
        puppeteer: {
          headless: true, // Modo invisible - Chrome no será visible
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-extensions',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
            '--disable-web-security',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
            '--disable-features=VizDisplayCompositor',
            '--single-process', // Agregar para evitar conflictos de procesos
            '--no-crash-upload' // Evitar reportes de crash
          ]
        },
        // Configuración adicional para evitar errores de sesión
        takeoverOnConflict: true,
        takeoverTimeoutMs: 0, // No esperar para takeover
        // DESHABILITAR RECONEXIONES AUTOMÁTICAS
        restartOnAuthFail: false, // No reiniciar en fallo de auth
        webVersionCache: {
          type: 'none' // No cache de versión web
        }
      });

      // Configurar eventos del cliente
      this.setupClientEvents(client, botIdString);

      // Almacenar cliente
      this.clients.set(botIdString, client);

      // Inicializar cliente con mejor manejo de errores
      console.log(`🔄 Inicializando cliente WhatsApp para bot ${botIdString}...`);
      
      try {
        // Inicializar con timeout de 60 segundos
        await Promise.race([
          client.initialize(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout en inicialización (60s)')), 60000)
          )
        ]);
        console.log(`✨ Inicialización completada para bot ${botIdString}!`);
      } catch (initError) {
        console.error(`💥 Error durante la inicialización de bot ${botIdString}:`, initError);
        // Limpiar si falla
        this.clients.delete(botIdString);
        this.qrCodes.delete(botIdString);
        throw initError;
      }

      return {
        success: true,
        message: 'Bot inicializado correctamente'
      };

    } catch (error) {
      console.error(`Error creando instancia para bot ${botIdString}:`, error);
      // Limpiar cliente si hay error
      this.clients.delete(botIdString);
      this.qrCodes.delete(botIdString);
      throw error;
    } finally {
      // Liberar mutex siempre
      if (this.creationMutex.has(botIdString)) {
        this.creationMutex.delete(botIdString);
        if (resolveMutex) {
          resolveMutex();
        }
      }
    }
  }

  // Configurar eventos del cliente WhatsApp
  setupClientEvents(client, botId) {
    const botIdString = botId.toString();
    
    console.log(`🚨 DEBUGGING: setupClientEvents llamado para bot ${botIdString}`);
    console.log(`📍 Stack trace:`, new Error().stack);
    
    // Evento QR - generar código QR
    client.on('qr', async (qr) => {
      try {
        console.log(`� Código QR generado para bot ${botIdString}. Escanea con WhatsApp:`);
        console.log(`🚨 DEBUGGING: Evento QR disparado para bot ${botIdString}`);
        
        // Generar QR en base64
        const qrImage = await qrcode.toDataURL(qr);
        
        // Almacenar QR temporalmente
        this.qrCodes.set(botIdString, qrImage);
        
        // Actualizar bot en BD
        await Bot.findByIdAndUpdate(botIdString, {
          status: 'pending',
          qrCode: qrImage,
          lastActivity: new Date()
        });

        // EMITIR EVENTO WEBSOCKET: QR generado
        websocketService.emitBotQRGenerated(botIdString, qrImage);
        websocketService.emitBotLog(botIdString, 'info', 'Código QR generado - escanea con WhatsApp');

      } catch (error) {
        console.error(`Error generando QR para bot ${botIdString}:`, error);
        websocketService.emitBotError(botIdString, error);
      }
    });

    // Evento loading_screen - pantalla de carga
    client.on('loading_screen', (percent, message) => {
      console.log(`⏳ Bot ${botIdString} cargando... ${percent}% - ${message}`);
    });

    // Evento authenticated - autenticado exitosamente  
    client.on('authenticated', async () => {
      console.log(`🔐 Bot ${botIdString} autenticado correctamente!`);
    });

    // Evento ready - cliente conectado
    client.on('ready', async () => {
      try {
        console.log(`✅ Bot ${botIdString} cliente listo y conectado!`);
        
        // Obtener número de teléfono
        const info = client.info;
        const phoneNumber = info ? info.wid.user : null;
        
        console.log(`📞 Número de teléfono para bot ${botIdString}: ${phoneNumber}`);
        
        // Actualizar bot en BD
        await Bot.findByIdAndUpdate(botIdString, {
          status: 'connected',
          phoneNumber: phoneNumber ? `+${phoneNumber}` : null,
          qrCode: null,
          isActive: true,
          lastActivity: new Date()
        });

        // Limpiar QR del mapa
        this.qrCodes.delete(botIdString);

        console.log(`✅ Bot ${botIdString} listo para enviar mensajes 📤`);

        // EMITIR EVENTO WEBSOCKET: Bot conectado
        websocketService.emitBotConnected(botIdString, phoneNumber ? `+${phoneNumber}` : null);
        websocketService.emitBotLog(botIdString, 'info', `Bot conectado exitosamente - Número: ${phoneNumber ? `+${phoneNumber}` : 'N/A'}`);

      } catch (error) {
        console.error(`Error en ready para bot ${botIdString}:`, error);
        websocketService.emitBotError(botIdString, error);
      }
    });

    // Evento auth_failure - error de autenticación
    client.on('auth_failure', async (msg) => {
      try {
        console.error(`❌ Error de autenticación para bot ${botIdString}:`, msg);
        
        await Bot.findByIdAndUpdate(botIdString, {
          status: 'error',
          lastActivity: new Date()
        });

        // Limpiar QR si hay error
        this.qrCodes.delete(botIdString);

        // EMITIR EVENTO WEBSOCKET: Error de autenticación
        websocketService.emitBotError(botIdString, new Error(`Error de autenticación: ${msg}`));
        websocketService.emitBotLog(botIdString, 'error', `Error de autenticación: ${msg}`);

      } catch (error) {
        console.error(`Error manejando auth_failure para bot ${botIdString}:`, error);
        websocketService.emitBotError(botIdString, error);
      }
    });

    // Evento disconnected - desconectado (desde celular/cuenta)
    client.on('disconnected', async (reason) => {
      try {
        console.log(`🔌 Bot ${botIdString} desconectado desde WhatsApp:`, reason);
        
        // Marcar como desconectado intencionalmente para evitar reconexión
        this.disconnectedIntentionally.add(botIdString);
        
        console.log(`💥 LIMPIEZA AUTOMÁTICA: Bot ${botIdString} empezará de cero en próxima conexión`);
        
        // 1. DESTRUIR EL CLIENTE INMEDIATAMENTE para evitar reconexiones
        console.log(`🔥 Destruyendo cliente para evitar reconexión automática...`);
        try {
          await client.destroy();
          console.log(`✅ Cliente destruido exitosamente`);
        } catch (destroyError) {
          console.log(`⚠️ Error destruyendo cliente: ${destroyError.message}`);
        }
        
        // 2. Limpiar de memoria inmediatamente
        this.clients.delete(botIdString);
        this.qrCodes.delete(botIdString);
        this.creationMutex.delete(botIdString);
        
        // 3. Nukear sesión en segundo plano (no bloquear)
        this.nukeSession(botIdString).catch(error => {
          console.log(`⚠️ Error auto-limpiando sesión de bot ${botIdString}: ${error.message}`);
        });
        
        // 4. Actualizar BD - resetear completamente
        await Bot.findByIdAndUpdate(botIdString, {
          status: 'pending',
          qrCode: null,
          phoneNumber: null,
          lastActivity: new Date()
        });

        console.log(`✅ Bot ${botIdString} limpiado automáticamente - Listo para configurar de cero`);
        console.log(`� Reconexión automática DESHABILITADA - Use POST /api/bots/${botIdString}/connect`);

        // EMITIR EVENTO WEBSOCKET: Bot desconectado
        websocketService.emitBotDisconnected(botIdString, reason || 'Desconectado desde WhatsApp');
        websocketService.emitBotLog(botIdString, 'warn', `Bot desconectado desde WhatsApp: ${reason || 'Sin razón especificada'}`);

      } catch (error) {
        console.error(`Error manejando disconnected para bot ${botIdString}:`, error);
        websocketService.emitBotError(botIdString, error);
      }
    });

    // Evento change_state - cambio de estado (detecta logout desde celular)
    client.on('change_state', async (state) => {
      console.log(`🔄 Bot ${botIdString} cambio de estado:`, state);
      
      if (state === 'UNPAIRED' || state === 'UNPAIRED_IDLE') {
        console.log(`📱 Bot ${botIdString} desvinculado desde celular - Limpiando automáticamente`);
        
        // Trigger del evento de limpieza automática
        setTimeout(async () => {
          await this.autoCleanBotAfterUnpair(botIdString);
        }, 1000);
      }
    });

    // Evento remote_session_saved - sesión remota (detecta cambios en celular)
    client.on('remote_session_saved', () => {
      console.log(`💾 Bot ${botIdString} sesión remota guardada`);
    });

    // Evento auth_failure - error de autenticación (prevenir reconexión)
    client.on('auth_failure', async (msg) => {
      try {
        console.error(`❌ Error de autenticación para bot ${botIdString}:`, msg);
        console.log(`🚫 Previniendo reconexión automática después de auth_failure`);
        
        // DESTRUIR CLIENTE INMEDIATAMENTE
        try {
          await client.destroy();
          console.log(`✅ Cliente destruido después de auth_failure`);
        } catch (destroyError) {
          console.log(`⚠️ Error destruyendo cliente después de auth_failure: ${destroyError.message}`);
        }
        
        // Limpiar memoria
        this.clients.delete(botIdString);
        this.qrCodes.delete(botIdString);
        this.creationMutex.delete(botIdString);
        
        await Bot.findByIdAndUpdate(botIdString, {
          status: 'error',
          qrCode: null,
          lastActivity: new Date()
        });

        console.log(`🚫 Bot ${botIdString} marcado como error - No se reconectará automáticamente`);

        // EMITIR EVENTO WEBSOCKET: Error de autenticación
        websocketService.emitBotError(botIdString, new Error(`Error de autenticación: ${msg}`));
        websocketService.emitBotLog(botIdString, 'error', `Error de autenticación - reconexión automática deshabilitada: ${msg}`);

      } catch (error) {
        console.error(`Error manejando auth_failure para bot ${botIdString}:`, error);
        websocketService.emitBotError(botIdString, error);
      }
    });
  }

  // Método auxiliar para limpiar automáticamente después de desvincular
  async autoCleanBotAfterUnpair(botIdString) {
    try {
      console.log(`🧹 Auto-limpieza después de desvincular bot ${botIdString}...`);
      
      // Limpiar memoria
      this.clients.delete(botIdString);
      this.qrCodes.delete(botIdString);
      this.creationMutex.delete(botIdString);
      
      // Nukear sesión
      await this.nukeSession(botIdString);
      
      // Resetear en BD
      await Bot.findByIdAndUpdate(botIdString, {
        status: 'pending',
        qrCode: null,
        phoneNumber: null,
        lastActivity: new Date()
      });
      
      console.log(`✅ Bot ${botIdString} limpiado después de desvincular - Listo para nueva configuración`);
      
    } catch (error) {
      console.error(`Error en auto-limpieza después de desvincular bot ${botIdString}:`, error);
    }
  }

  // Enviar mensaje desde un bot específico
  async sendMessage(botId, to, message) {
    try {
      const botIdString = botId.toString();
      const client = this.clients.get(botIdString);
      
      console.log(`🔍 Debug sendMessage para bot ${botIdString}:`, {
        clientExists: !!client,
        clientInfo: client ? !!client.info : 'no client',
        clientWid: client && client.info ? !!client.info.wid : 'no wid'
      });
      
      if (!client) {
        throw new Error('Bot no está conectado a WhatsApp');
      }

      // Verificar si el cliente está listo con múltiples métodos
      let isReady = false;
      
      try {
        // Método 1: Verificar info
        if (client.info && client.info.wid) {
          isReady = true;
        }
        
        // Método 2: Verificar estado si info no está disponible
        if (!isReady) {
          const state = await client.getState();
          isReady = (state === 'CONNECTED');
        }
      } catch (stateError) {
        console.log(`Error verificando estado del bot ${botIdString}:`, stateError.message);
      }

      if (!isReady) {
        throw new Error('Bot no está listo para enviar mensajes');
      }

      // Formatear número (agregar @c.us si es necesario)
      const chatId = to.includes('@') ? to : `${to}@c.us`;
      
      console.log(`📤 Enviando mensaje desde bot ${botIdString} a ${chatId}: "${message}"`);
      
      // Crear registro del mensaje
      const messageDoc = new Message({
        bot: botIdString,
        to: to,
        message: message,
        status: 'pending'
      });
      await messageDoc.save();

      try {
        // Enviar mensaje
        const sentMessage = await client.sendMessage(chatId, message);
        
        console.log(`✅ Mensaje enviado exitosamente desde bot ${botIdString}`);
        
        // Actualizar mensaje como enviado
        await messageDoc.markAsSent(sentMessage.id._serialized);
        
        // Actualizar última actividad del bot
        await Bot.findByIdAndUpdate(botIdString, {
          lastActivity: new Date()
        });

        // EMITIR EVENTO WEBSOCKET: Mensaje enviado
        websocketService.emitMessageSent(botIdString, {
          messageId: sentMessage.id._serialized,
          to: to,
          message: message,
          timestamp: new Date().toISOString()
        });
        websocketService.emitBotLog(botIdString, 'info', `Mensaje enviado a ${to}: ${message.substring(0, 50)}${message.length > 50 ? '...' : ''}`);

        return {
          success: true,
          messageId: sentMessage.id._serialized,
          message: 'Mensaje enviado exitosamente'
        };

      } catch (sendError) {
        // Marcar mensaje como fallido
        await messageDoc.markAsFailed(sendError.message);
        
        // EMITIR EVENTO WEBSOCKET: Error enviando mensaje
        websocketService.emitBotError(botIdString, sendError);
        websocketService.emitBotLog(botIdString, 'error', `Error enviando mensaje a ${to}: ${sendError.message}`);
        
        throw sendError;
      }

    } catch (error) {
      console.error(`Error enviando mensaje desde bot ${botIdString}:`, error);
      throw error;
    }
  }

  // Obtener estado de un bot
  // Obtener estado simple de un bot
  getBotStatus(botId) {
    const botIdString = botId.toString();
    const client = this.clients.get(botIdString);
    const hasQR = this.qrCodes.has(botIdString);
    
    console.log(`🔍 Debug getBotStatus para bot ${botIdString}:`, {
      clientExists: !!client,
      hasQR: hasQR,
      clientInfo: client ? !!client.info : 'no client',
      clientWid: client && client.info ? !!client.info.wid : 'no wid'
    });
    
    return {
      clientExists: !!client,
      hasQR: hasQR,
      isReady: client ? !!(client.info && client.info.wid) : false
    };
  }

  // Obtener QR code de un bot
  getBotQR(botId) {
    return this.qrCodes.get(botId) || null;
  }

  // Destruir instancia de bot de manera más agresiva
  async destroyBotInstance(botId) {
    try {
      const botIdString = botId.toString();
      const client = this.clients.get(botIdString);
      
      if (client) {
        console.log(`🔄 Terminando cliente WhatsApp para bot ${botIdString}...`);
        
        try {
          // Evitar logout completamente - solo destruir bruscamente
          // Esto evita el error EBUSY al no tocar los archivos de sesión
          
          // Cerrar navegador directamente si existe
          if (client.pupBrowser) {
            console.log(`🌐 Cerrando navegador para bot ${botIdString}...`);
            await client.pupBrowser.close();
          }
          
          // Destruir sin logout - más agresivo
          await client.destroy();
          
        } catch (destroyError) {
          console.log(`⚠️ Error destruyendo cliente para bot ${botIdString}:`, destroyError.message);
          
          // Si aún falla, intentar cerrar el proceso del navegador a la fuerza
          try {
            if (client.pupPage) {
              await client.pupPage.close();
            }
          } catch (pageError) {
            console.log(`⚠️ Error cerrando página para bot ${botIdString}:`, pageError.message);
          }
        }

        // Remover inmediatamente de memoria
        this.clients.delete(botIdString);
      }

      this.qrCodes.delete(botIdString);

      // Actualizar estado en BD
      await Bot.findByIdAndUpdate(botIdString, {
        status: 'disconnected',
        qrCode: null
      });

      console.log(`🗑️ Instancia del bot ${botIdString} terminada bruscamente (sin logout)`);
      
      // Tiempo de espera más largo para que se liberen completamente los recursos
      await new Promise(resolve => setTimeout(resolve, 3000));
      
    } catch (error) {
      console.error(`Error terminando instancia del bot ${botIdString}:`, error.message);
      
      // Forzar limpieza en memoria sin importar el error
      this.clients.delete(botIdString);
      this.qrCodes.delete(botIdString);
      
      console.log(`🔄 Limpieza forzada completada para bot ${botIdString}`);
    }
  }

  // Obtener estadísticas de mensajes de un bot
  async getBotStats(botId) {
    try {
      const stats = await Message.aggregate([
        { $match: { bot: new mongoose.Types.ObjectId(botId) } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);

      const result = {
        total: 0,
        sent: 0,
        pending: 0,
        failed: 0
      };

      stats.forEach(stat => {
        result[stat._id] = stat.count;
        result.total += stat.count;
      });

      return result;

    } catch (error) {
      console.error(`Error obteniendo estadísticas del bot ${botId}:`, error);
      throw error;
    }
  }

  // Limpiar sesión corrupta de un bot
  async cleanBotSession(botId) {
    try {
      const sessionPath = path.join(process.cwd(), '.wwebjs_auth', `session-bot_${botId}`);
      
      console.log(`🧹 Limpiando sesión corrupta para bot ${botId}...`);
      
      try {
        // Verificar si existe el directorio
        await fs.access(sessionPath);
        
        // Intentar eliminar el directorio completo
        await fs.rm(sessionPath, { recursive: true, force: true });
        
        console.log(`✅ Sesión limpiada para bot ${botId}`);
        return true;
        
      } catch (cleanError) {
        if (cleanError.code === 'ENOENT') {
          console.log(`ℹ️ No hay sesión que limpiar para bot ${botId}`);
          return true;
        }
        
        console.error(`❌ Error limpiando sesión para bot ${botId}:`, cleanError.message);
        return false;
      }
      
    } catch (error) {
      console.error(`Error en limpieza de sesión para bot ${botId}:`, error);
      return false;
    }
  }

  // Limpiar todas las sesiones huérfanas
  async cleanOrphanSessions() {
    try {
      const authPath = path.join(process.cwd(), '.wwebjs_auth');
      
      try {
        const sessions = await fs.readdir(authPath);
        const activeBots = await Bot.find({ isActive: true }).select('_id');
        const activeBotIds = activeBots.map(bot => `session-bot_${bot._id}`);
        
        for (const session of sessions) {
          if (session.startsWith('session-bot_') && !activeBotIds.includes(session)) {
            console.log(`🧹 Eliminando sesión huérfana: ${session}`);
            const sessionPath = path.join(authPath, session);
            await fs.rm(sessionPath, { recursive: true, force: true });
          }
        }
        
        console.log(`✅ Limpieza de sesiones huérfanas completada`);
        
      } catch (dirError) {
        if (dirError.code === 'ENOENT') {
          console.log(`ℹ️ No existe directorio de sesiones`);
        }
      }
      
    } catch (error) {
      console.error('Error limpiando sesiones huérfanas:', error);
    }
  }

  // Verificar si un bot está realmente conectado y funcional
  async verifyBotConnection(botId) {
    try {
      const client = this.clients.get(botId);
      
      if (!client) {
        return {
          connected: false,
          reason: 'Cliente no encontrado en memoria'
        };
      }

      if (!client.info) {
        return {
          connected: false,
          reason: 'Cliente sin información de sesión'
        };
      }

      // Intentar obtener estado de WhatsApp
      try {
        const state = await client.getState();
        return {
          connected: state === 'CONNECTED',
          state: state,
          phoneNumber: client.info.wid.user,
          reason: state !== 'CONNECTED' ? `Estado: ${state}` : 'Conectado correctamente'
        };
      } catch (stateError) {
        return {
          connected: false,
          reason: `Error obteniendo estado: ${stateError.message}`
        };
      }

    } catch (error) {
      return {
        connected: false,
        reason: `Error de verificación: ${error.message}`
      };
    }
  }

  // Obtener QR code de un bot
  getBotQR(botId) {
    return this.qrCodes.get(botId.toString());
  }

  // Debugging: Listar todas las instancias activas
  listActiveInstances() {
    console.log(`🔍 DEBUGGING: Instancias activas en memoria:`);
    console.log(`  - Clientes: ${Array.from(this.clients.keys())}`);
    console.log(`  - QR Codes: ${Array.from(this.qrCodes.keys())}`);
    console.log(`  - Mutex: ${Array.from(this.creationMutex.keys())}`);
  }

  // Debugging: Limpiar TODAS las instancias en memoria
  async clearAllInstances() {
    console.log(`🧹 DEBUGGING: Limpiando TODAS las instancias en memoria...`);
    
    // Destruir todos los clientes
    for (const [botId, client] of this.clients.entries()) {
      try {
        console.log(`🔌 Destruyendo cliente ${botId}...`);
        await client.destroy();
      } catch (error) {
        console.log(`⚠️ Error destruyendo cliente ${botId}:`, error.message);
      }
    }
    
    // Limpiar mapas
    this.clients.clear();
    this.qrCodes.clear();
    this.creationMutex.clear();
    
    console.log(`✅ DEBUGGING: Todas las instancias limpiadas`);
  }

  // Limpiar instancia específica de memoria (público)
  clearBotFromMemory(botId) {
    const botIdString = botId.toString();
    console.log(`🧹 Limpiando bot ${botIdString} de memoria...`);
    
    this.clients.delete(botIdString);
    this.qrCodes.delete(botIdString);
    this.creationMutex.delete(botIdString);
    this.disconnectedIntentionally.delete(botIdString); // Limpiar bandera también
    
    console.log(`✅ Bot ${botIdString} limpiado de memoria`);
  }

  // Reiniciar bot con limpieza completa - EMPEZAR DE CERO
  async restartBot(botId) {
    try {
      const botIdString = botId.toString();
      console.log(`🔄 Reiniciando bot ${botIdString} - EMPEZANDO DE CERO...`);
      
      // 1. LIMPIAR TODO EN MEMORIA
      console.log(`🧹 Limpiando completamente en memoria...`);
      this.clients.delete(botIdString);
      this.qrCodes.delete(botIdString);
      this.creationMutex.delete(botIdString);
      
      // 2. FORZAR ELIMINACIÓN DE TODA LA SESIÓN
      console.log(`🗑️ Eliminando TODA la sesión...`);
      await this.nukeSession(botIdString);
      
      // 3. ESPERAR UN POCO PARA QUE TODO SE LIBERE
      console.log(`⏱️ Esperando limpieza completa...`);
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // 4. CREAR COMPLETAMENTE NUEVO
      console.log(`� Creando instancia completamente nueva...`);
      const result = await Promise.race([
        this.createBotInstance(botIdString),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout creando instancia (60s)')), 60000))
      ]);
      
      console.log(`✅ Restart completado - bot ${botIdString} empezó de cero`);
      return result;
      
    } catch (error) {
      console.error(`❌ Error reiniciando bot ${botId}:`, error);
      
      // Si falla, limpiar TODO
      const botIdString = botId.toString();
      this.clients.delete(botIdString);
      this.qrCodes.delete(botIdString);
      this.creationMutex.delete(botIdString);
      
      throw error;
    }
  }

  // NUEVO: Eliminación nuclear de sesión (no intenta reparar nada)
  async nukeSession(botId) {
    try {
      const sessionPath = path.join(process.cwd(), '.wwebjs_auth', `session-bot_${botId}`);
      
      console.log(`💥 NUKING sesión para bot ${botId}...`);
      
      // Intentar eliminar múltiples veces si es necesario
      for (let i = 0; i < 3; i++) {
        try {
          await fs.rm(sessionPath, { recursive: true, force: true });
          console.log(`✅ Sesión NUKEDA exitosamente para bot ${botId}`);
          return true;
        } catch (error) {
          if (error.code === 'ENOENT') {
            console.log(`ℹ️ No hay sesión que nukear para bot ${botId}`);
            return true;
          }
          
          if (i < 2) { // No es el último intento
            console.log(`⚠️ Intento ${i + 1} falló, reintentando: ${error.message}`);
            await new Promise(resolve => setTimeout(resolve, 1000));
          } else {
            console.log(`❌ No se pudo nukear sesión después de 3 intentos: ${error.message}`);
            console.log(`🤷 Continuando de todos modos...`);
            return false;
          }
        }
      }
      
    } catch (error) {
      console.error(`Error en nukeo de sesión para bot ${botId}:`, error);
      return false;
    }
  }
}

module.exports = new WhatsAppService();