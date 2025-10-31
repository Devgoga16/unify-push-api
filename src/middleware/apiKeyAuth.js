const Bot = require('../models/Bot');

/**
 * Middleware de autenticación por API Key
 * Valida el API_KEY en el header y adjunta información del bot al request
 */
const authenticateApiKey = async (req, res, next) => {
  try {
    const apiKey = req.headers['api_key'] || req.headers['API_KEY'];
    
    if (!apiKey) {
      return res.status(401).json({
        success: false,
        error: 'API Key requerida',
        message: 'Debe proporcionar un API_KEY válido en el header'
      });
    }

    // Buscar bot por API Key
    const bot = await Bot.findOne({ 
      apiKey: apiKey,
      isActive: true 
    }).populate('owner', 'name email role');

    if (!bot) {
      return res.status(401).json({
        success: false,
        error: 'API Key inválida',
        message: 'La API Key proporcionada no es válida o el bot está inactivo'
      });
    }

    // Adjuntar información del bot al request
    req.bot = bot;
    req.apiKey = apiKey;

    // Log de acceso
    console.log(`🔑 API Key Access: Bot ${bot.name} (${bot._id}) - IP: ${req.ip} - Endpoint: ${req.method} ${req.originalUrl}`);

    next();
  } catch (error) {
    console.error('Error en autenticación por API Key:', error);
    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: 'Error al validar API Key'
    });
  }
};

/**
 * Middleware opcional para rate limiting por API Key
 */
const rateLimit = {
  // Almacenar contadores en memoria (en producción usar Redis)
  counters: new Map(),
  
  // Límite por defecto: 60 requests por minuto
  check: (apiKey, limit = 60, window = 60000) => {
    const now = Date.now();
    const key = `${apiKey}_${Math.floor(now / window)}`;
    
    const current = rateLimit.counters.get(key) || 0;
    
    if (current >= limit) {
      return false;
    }
    
    rateLimit.counters.set(key, current + 1);
    
    // Limpiar contadores antiguos
    setTimeout(() => {
      rateLimit.counters.delete(key);
    }, window);
    
    return true;
  }
};

/**
 * Middleware de rate limiting
 */
const rateLimitMiddleware = (limit = 60) => {
  return (req, res, next) => {
    const apiKey = req.apiKey;
    
    if (!rateLimit.check(apiKey, limit)) {
      return res.status(429).json({
        success: false,
        error: 'Rate limit excedido',
        message: `Máximo ${limit} requests por minuto permitidos`,
        retryAfter: 60
      });
    }
    
    next();
  };
};

module.exports = {
  authenticateApiKey,
  rateLimitMiddleware
};