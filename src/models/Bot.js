const mongoose = require('mongoose');
// Usar una alternativa compatible con CommonJS
const crypto = require('crypto');

// Función para generar UUID compatible
function generateApiKey() {
  return `bot_${crypto.randomBytes(16).toString('hex')}`;
}

/**
 * @swagger
 * components:
 *   schemas:
 *     Bot:
 *       type: object
 *       required:
 *         - name
 *         - description
 *       properties:
 *         _id:
 *           type: string
 *           description: ID único del bot
 *         name:
 *           type: string
 *           description: Nombre del bot
 *         description:
 *           type: string
 *           description: Descripción del bot
 *         apiKey:
 *           type: string
 *           description: API Key única para el bot
 *         status:
 *           type: string
 *           enum: [pending, connected, disconnected, error]
 *           description: Estado de conexión del bot
 *         qrCode:
 *           type: string
 *           description: Código QR base64 para autenticación
 *         phoneNumber:
 *           type: string
 *           description: Número de teléfono conectado
 *         owner:
 *           type: string
 *           description: ID del usuario propietario
 *         isActive:
 *           type: boolean
 *           description: Si el bot está activo
 *         lastActivity:
 *           type: string
 *           format: date-time
 *           description: Última actividad del bot
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Fecha de creación
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Fecha de última actualización
 *       example:
 *         _id: "507f1f77bcf86cd799439011"
 *         name: "Mi Bot de WhatsApp"
 *         description: "Bot para envío de mensajes automáticos"
 *         apiKey: "bot_1234567890abcdef"
 *         status: "connected"
 *         phoneNumber: "+51955768897"
 *         owner: "507f1f77bcf86cd799439012"
 *         isActive: true
 *         lastActivity: "2023-01-01T00:00:00.000Z"
 *         createdAt: "2023-01-01T00:00:00.000Z"
 *         updatedAt: "2023-01-01T00:00:00.000Z"
 *     BotCreate:
 *       type: object
 *       required:
 *         - name
 *         - description
 *       properties:
 *         name:
 *           type: string
 *           description: Nombre del bot
 *           minLength: 3
 *           maxLength: 50
 *         description:
 *           type: string
 *           description: Descripción del bot
 *           minLength: 10
 *           maxLength: 200
 *       example:
 *         name: "Mi Bot de WhatsApp"
 *         description: "Bot para envío de mensajes automáticos a clientes"
 *     BotMessage:
 *       type: object
 *       required:
 *         - to
 *         - message
 *       properties:
 *         to:
 *           type: string
 *           description: Número de teléfono destinatario (formato internacional)
 *           pattern: '^[1-9]\d{1,14}$'
 *         message:
 *           type: string
 *           description: Mensaje a enviar
 *           minLength: 1
 *           maxLength: 1000
 *       example:
 *         to: "51955768897"
 *         message: "Hola, este es un mensaje desde mi bot!"
 */

const botSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'El nombre del bot es requerido'],
    trim: true,
    minlength: [3, 'El nombre debe tener al menos 3 caracteres'],
    maxlength: [50, 'El nombre no puede exceder 50 caracteres']
  },
  description: {
    type: String,
    required: [true, 'La descripción es requerida'],
    trim: true,
    minlength: [10, 'La descripción debe tener al menos 10 caracteres'],
    maxlength: [200, 'La descripción no puede exceder 200 caracteres']
  },
  apiKey: {
    type: String,
    unique: true,
    default: generateApiKey
  },
  status: {
    type: String,
    enum: ['pending', 'connected', 'disconnected', 'error'],
    default: 'pending'
  },
  qrCode: {
    type: String,
    default: null
  },
  phoneNumber: {
    type: String,
    default: null
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  // Configuraciones adicionales del bot
  settings: {
    autoReply: {
      type: Boolean,
      default: false
    },
    welcomeMessage: {
      type: String,
      default: ''
    },
    maxMessagesPerMinute: {
      type: Number,
      default: 10,
      min: 1,
      max: 100
    }
  }
}, {
  timestamps: true,
  versionKey: false
});

// Índices
botSchema.index({ owner: 1 });
botSchema.index({ apiKey: 1 });
botSchema.index({ status: 1 });

// Método para actualizar última actividad
botSchema.methods.updateActivity = function() {
  this.lastActivity = new Date();
  return this.save();
};

// Método para generar nueva API key
botSchema.methods.regenerateApiKey = function() {
  this.apiKey = generateApiKey();
  return this.save();
};

// Método para obtener URL del endpoint
botSchema.methods.getEndpointUrl = function() {
  const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
  return `${baseUrl}/api/bots/${this.apiKey}/send`;
};

// Virtual para mensajes enviados (se implementará con otro modelo)
botSchema.virtual('messagesSent', {
  ref: 'Message',
  localField: '_id',
  foreignField: 'bot'
});

module.exports = mongoose.model('Bot', botSchema);