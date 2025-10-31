const express = require('express');
const router = express.Router();
const {
  sendMessage,
  getBotStatus,
  getBotStatusByApiKey
} = require('../controllers/messageController');
const { validateMessage } = require('../middleware/validation');
const { authenticateApiKey, rateLimitMiddleware } = require('../middleware/apiKeyAuth');
const botLifecycleService = require('../services/botLifecycleService');

/**
 * @swagger
 * tags:
 *   name: Messages
 *   description: Envío de mensajes por WhatsApp (endpoints públicos con API Key)
 */

/**
 * @swagger
 * /api/bots/{botId}/send:
 *   post:
 *     summary: Enviar mensaje de WhatsApp
 *     description: |
 *       Endpoint público para enviar mensajes usando la API Key en el header.
 *       No requiere autenticación JWT, solo la API Key en el header API_KEY.
 *     tags: [Messages]
 *     parameters:
 *       - in: path
 *         name: botId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID único del bot
 *         example: "690418b2646e2e2d8e354953"
 *       - in: header
 *         name: API_KEY
 *         required: true
 *         schema:
 *           type: string
 *         description: API Key única del bot
 *         example: "bot_abc123def456789"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BotMessage'
 *     responses:
 *       200:
 *         description: Mensaje enviado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     messageId:
 *                       type: string
 *                       description: ID del mensaje en WhatsApp
 *                       example: "false_51955768897@c.us_3EB0C4D4B7C123456789"
 *                     message:
 *                       type: string
 *                       example: "Mensaje enviado exitosamente"
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                       example: "2023-01-01T12:00:00.000Z"
 *                     bot:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           example: "690418b2646e2e2d8e354953"
 *                         name:
 *                           type: string
 *                           example: "Mi Bot de WhatsApp"
 *                         phoneNumber:
 *                           type: string
 *                           example: "+51955768897"
 *                     recipient:
 *                       type: string
 *                       example: "51955768897"
 *                     sentAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2023-01-01T12:00:00.000Z"
 *       400:
 *         description: Datos inválidos o bot no conectado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Bot no está conectado a WhatsApp"
 *                 botInfo:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                       example: "Mi Bot de WhatsApp"
 *                     status:
 *                       type: string
 *                       example: "disconnected"
 *                     phoneNumber:
 *                       type: string
 *                       example: "+51955768897"
 *       401:
 *         description: API Key inválida o faltante
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "API Key requerida"
 *                 message:
 *                   type: string
 *                   example: "Debe proporcionar un API_KEY válido en el header"
 *       403:
 *         description: Bot ID no coincide con API Key
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Bot ID no coincide con la API Key"
 *       429:
 *         description: Rate limit excedido
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Rate limit excedido"
 *                 retryAfter:
 *                   type: number
 *                   example: 60
 *       500:
 *         description: Error del servidor
 */
router.post('/:botId/send', authenticateApiKey, rateLimitMiddleware(60), validateMessage, sendMessage);

/**
 * @swagger
 * /api/bots/{botId}/status:
 *   get:
 *     summary: Obtener estado del bot
 *     description: |
 *       Endpoint público para verificar el estado de conexión del bot.
 *       Útil para validar si el bot está listo para enviar mensajes.
 *     tags: [Messages]
 *     parameters:
 *       - in: path
 *         name: botId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID único del bot
 *         example: "690418b2646e2e2d8e354953"
 *       - in: header
 *         name: API_KEY
 *         required: true
 *         schema:
 *           type: string
 *         description: API Key única del bot
 *         example: "bot_abc123def456789"
 *     responses:
 *       200:
 *         description: Estado del bot obtenido exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "690418b2646e2e2d8e354953"
 *                     name:
 *                       type: string
 *                       example: "Mi Bot de WhatsApp"
 *                     status:
 *                       type: string
 *                       enum: [pending, connected, disconnected, error]
 *                       example: "connected"
 *                     phoneNumber:
 *                       type: string
 *                       example: "+51955768897"
 *                     lastActivity:
 *                       type: string
 *                       format: date-time
 *                       example: "2023-01-01T12:00:00.000Z"
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2023-01-01T10:00:00.000Z"
 *                     realTimeStatus:
 *                       type: object
 *                       properties:
 *                         connected:
 *                           type: boolean
 *                           example: true
 *                         clientExists:
 *                           type: boolean
 *                           example: true
 *                         isReady:
 *                           type: boolean
 *                           example: true
 *                         status:
 *                           type: string
 *                           example: "connected"
 *                         phoneNumber:
 *                           type: string
 *                           example: "51955768897"
 *                     isReady:
 *                       type: boolean
 *                       description: Si el bot está listo para enviar mensajes
 *                       example: true
 *                     capabilities:
 *                       type: object
 *                       properties:
 *                         sendMessages:
 *                           type: boolean
 *                           example: true
 *                         receiveMessages:
 *                           type: boolean
 *                           example: true
 *                         sendMedia:
 *                           type: boolean
 *                           example: true
 *                         groupMessages:
 *                           type: boolean
 *                           example: true
 *       401:
 *         description: API Key inválida o faltante
 *       403:
 *         description: Bot ID no coincide con API Key
 *       500:
 *         description: Error del servidor
 */
router.get('/:botId/status', authenticateApiKey, getBotStatus);

// ENDPOINTS DE COMPATIBILIDAD (usando API Key en URL)
/**
 * @swagger
 * /api/bots/{apiKey}/send-legacy:
 *   post:
 *     summary: Enviar mensaje (método legacy)
 *     description: |
 *       Endpoint de compatibilidad con API Key en URL.
 *       DEPRECATED: Use /api/bots/{botId}/send con API_KEY en header.
 *     tags: [Messages]
 *     deprecated: true
 *     parameters:
 *       - in: path
 *         name: apiKey
 *         required: true
 *         schema:
 *           type: string
 *         description: API Key única del bot
 *         example: "bot_abc123def456"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BotMessage'
 *     responses:
 *       200:
 *         description: Mensaje enviado exitosamente
 *       400:
 *         description: Datos inválidos o bot no conectado
 *       404:
 *         description: API Key inválida
 *       500:
 *         description: Error del servidor
 */
router.post('/:apiKey/send-legacy', validateMessage, sendMessage);

/**
 * @swagger
 * /api/bots/{apiKey}/status-legacy:
 *   get:
 *     summary: Obtener estado del bot (método legacy)
 *     description: |
 *       Endpoint de compatibilidad con API Key en URL.
 *       DEPRECATED: Use /api/bots/{botId}/status con API_KEY en header.
 *     tags: [Messages]
 *     deprecated: true
 *     parameters:
 *       - in: path
 *         name: apiKey
 *         required: true
 *         schema:
 *           type: string
 *         description: API Key única del bot
 *         example: "bot_abc123def456"
 *     responses:
 *       200:
 *         description: Estado del bot obtenido exitosamente
 *       404:
 *         description: API Key inválida
 *       500:
 *         description: Error del servidor
 */
router.get('/:apiKey/status-legacy', getBotStatusByApiKey);

// ENDPOINT ADMINISTRATIVO: Verificar y corregir inconsistencias de estado
/**
 * @swagger
 * /api/bots/verify-consistency:
 *   post:
 *     summary: Verificar y corregir inconsistencias de estado de bots
 *     description: |
 *       Endpoint administrativo para verificar y corregir bots que están marcados
 *       como "connected" en BD pero no tienen cliente activo en memoria.
 *     tags: [Messages]
 *     responses:
 *       200:
 *         description: Verificación completada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: number
 *                       example: 5
 *                     checked:
 *                       type: number
 *                       example: 5
 *                     fixed:
 *                       type: number
 *                       example: 2
 *                     errors:
 *                       type: number
 *                       example: 0
 */
router.post('/verify-consistency', async (req, res) => {
  try {
    console.log('🔍 Ejecutando verificación de consistencia de bots...');
    const results = await botLifecycleService.verifyAndFixAllBots();
    
    res.status(200).json({
      success: true,
      message: 'Verificación de consistencia completada',
      data: results
    });
  } catch (error) {
    console.error('❌ Error en verificación de consistencia:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

module.exports = router;