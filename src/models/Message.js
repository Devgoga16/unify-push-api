const mongoose = require('mongoose');

/**
 * @swagger
 * components:
 *   schemas:
 *     Message:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: ID único del mensaje
 *         bot:
 *           type: string
 *           description: ID del bot que envió el mensaje
 *         to:
 *           type: string
 *           description: Número destinatario
 *         message:
 *           type: string
 *           description: Contenido del mensaje
 *         status:
 *           type: string
 *           enum: [pending, sent, delivered, failed]
 *           description: Estado del mensaje
 *         messageId:
 *           type: string
 *           description: ID del mensaje en WhatsApp
 *         error:
 *           type: string
 *           description: Error si el mensaje falló
 *         sentAt:
 *           type: string
 *           format: date-time
 *           description: Fecha de envío
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Fecha de creación
 */

const messageSchema = new mongoose.Schema({
  bot: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bot',
    required: true
  },
  to: {
    type: String,
    required: [true, 'El número destinatario es requerido'],
    match: [/^[1-9]\d{1,14}$/, 'Formato de número inválido']
  },
  message: {
    type: String,
    required: [true, 'El mensaje es requerido'],
    maxlength: [1000, 'El mensaje no puede exceder 1000 caracteres']
  },
  status: {
    type: String,
    enum: ['pending', 'sent', 'delivered', 'failed'],
    default: 'pending'
  },
  messageId: {
    type: String,
    default: null
  },
  error: {
    type: String,
    default: null
  },
  sentAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  versionKey: false
});

// Índices
messageSchema.index({ bot: 1 });
messageSchema.index({ status: 1 });
messageSchema.index({ createdAt: -1 });

// Método para marcar como enviado
messageSchema.methods.markAsSent = function(messageId) {
  this.status = 'sent';
  this.messageId = messageId;
  this.sentAt = new Date();
  return this.save();
};

// Método para marcar como fallido
messageSchema.methods.markAsFailed = function(error) {
  this.status = 'failed';
  this.error = error;
  return this.save();
};

module.exports = mongoose.model('Message', messageSchema);