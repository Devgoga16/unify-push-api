const express = require('express');
const router = express.Router();
const {
  createBot,
  getUserBots,
  refreshAllBots,
  getBotById,
  getBotQR,
  getBotQRImage,
  getBotQRImagePublic,
  restartBot,
  connectBot,
  disconnectBot,
  updateBot,
  deleteBot,
  regenerateApiKey,
  getBotMessages
} = require('../controllers/botController');
const { validateBotCreate, validateBotUpdate } = require('../middleware/validation');
const { authenticate } = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Bots
 *   description: Gestión de bots de WhatsApp
 */

/**
 * @swagger
 * /api/bots:
 *   post:
 *     summary: Crear nuevo bot de WhatsApp
 *     tags: [Bots]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BotCreate'
 *     responses:
 *       201:
 *         description: Bot creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   allOf:
 *                     - $ref: '#/components/schemas/Bot'
 *                     - type: object
 *                       properties:
 *                         endpointUrl:
 *                           type: string
 *                           example: "http://localhost:3000/api/bots/bot_abc123/send"
 *       400:
 *         description: Datos inválidos
 *       401:
 *         description: Token inválido
 *       500:
 *         description: Error del servidor
 */
router.post('/', authenticate, validateBotCreate, createBot);

/**
 * @swagger
 * /api/bots:
 *   get:
 *     summary: Obtener todos los bots del usuario
 *     tags: [Bots]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de bots obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 count:
 *                   type: number
 *                   example: 2
 *                 data:
 *                   type: array
 *                   items:
 *                     allOf:
 *                       - $ref: '#/components/schemas/Bot'
 *                       - type: object
 *                         properties:
 *                           realTimeStatus:
 *                             type: object
 *                             properties:
 *                               connected:
 *                                 type: boolean
 *                               status:
 *                                 type: string
 *                           endpointUrl:
 *                             type: string
 *       401:
 *         description: Token inválido
 *       500:
 *         description: Error del servidor
 */
router.get('/', authenticate, getUserBots);

/**
 * @swagger
 * /api/bots/refresh:
 *   post:
 *     summary: Forzar actualización del estado de todos los bots
 *     description: Actualiza el estado de todos los bots y emite eventos WebSocket para sincronizar con el frontend. Útil para detectar cambios directos en la base de datos.
 *     tags: [Bots]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estado de bots actualizado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Estado de bots actualizado y notificado a todos los clientes conectados"
 *                 count:
 *                   type: number
 *                   example: 3
 *                 data:
 *                   type: array
 *                   items:
 *                     allOf:
 *                       - $ref: '#/components/schemas/Bot'
 *                       - type: object
 *                         properties:
 *                           realTimeStatus:
 *                             type: object
 *                           isReady:
 *                             type: boolean
 *                           endpointUrl:
 *                             type: string
 *       401:
 *         description: Token inválido
 *       500:
 *         description: Error del servidor
 */
router.post('/refresh', authenticate, refreshAllBots);

/**
 * @swagger
 * /api/bots/{id}:
 *   get:
 *     summary: Obtener bot por ID
 *     tags: [Bots]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del bot
 *     responses:
 *       200:
 *         description: Bot encontrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   allOf:
 *                     - $ref: '#/components/schemas/Bot'
 *                     - type: object
 *                       properties:
 *                         realTimeStatus:
 *                           type: object
 *                         statistics:
 *                           type: object
 *                           properties:
 *                             total:
 *                               type: number
 *                             sent:
 *                               type: number
 *                             pending:
 *                               type: number
 *                             failed:
 *                               type: number
 *                         endpointUrl:
 *                           type: string
 *       404:
 *         description: Bot no encontrado
 *       401:
 *         description: Token inválido
 *       500:
 *         description: Error del servidor
 */
router.get('/:id', authenticate, getBotById);

/**
 * @swagger
 * /api/bots/{id}/qr:
 *   get:
 *     summary: Obtener código QR del bot
 *     tags: [Bots]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del bot
 *     responses:
 *       200:
 *         description: Código QR obtenido
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
 *                     qrCode:
 *                       type: string
 *                       description: Código QR en base64
 *                     status:
 *                       type: string
 *                     message:
 *                       type: string
 *                     imageUrl:
 *                       type: string
 *                       description: URL para obtener el QR como imagen PNG
 *                       example: "http://localhost:3000/api/bots/123/qr-image"
 *       404:
 *         description: Bot no encontrado o QR no disponible
 *       401:
 *         description: Token inválido
 *       500:
 *         description: Error del servidor
 */
router.get('/:id/qr', authenticate, getBotQR);

/**
 * @swagger
 * /api/bots/{id}/qr-image:
 *   get:
 *     summary: Obtener código QR como imagen PNG
 *     tags: [Bots]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del bot
 *     responses:
 *       200:
 *         description: Imagen PNG del código QR
 *         content:
 *           image/png:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Bot ya está conectado
 *       404:
 *         description: Bot no encontrado o QR no disponible
 *       401:
 *         description: Token inválido
 *       500:
 *         description: Error del servidor
 */
router.get('/:id/qr-image', authenticate, getBotQRImage);

/**
 * @swagger
 * /api/bots/{id}/restart:
 *   post:
 *     summary: Reiniciar bot (generar nuevo QR)
 *     tags: [Bots]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del bot
 *     responses:
 *       200:
 *         description: Bot reiniciado exitosamente
 *       404:
 *         description: Bot no encontrado
 *       401:
 *         description: Token inválido
 *       500:
 *         description: Error del servidor
 */
router.post('/:id/restart', authenticate, restartBot);

/**
 * @swagger
 * /api/bots/{id}/connect:
 *   post:
 *     summary: Conectar bot a WhatsApp
 *     tags: [Bots]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del bot
 *     responses:
 *       200:
 *         description: Bot conectándose a WhatsApp
 *       404:
 *         description: Bot no encontrado
 *       401:
 *         description: Token inválido
 *       500:
 *         description: Error del servidor
 */
router.post('/:id/connect', authenticate, connectBot);

/**
 * @swagger
 * /api/bots/{id}/disconnect:
 *   post:
 *     summary: Desconectar bot de WhatsApp
 *     tags: [Bots]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del bot
 *     responses:
 *       200:
 *         description: Bot desconectado exitosamente
 *       404:
 *         description: Bot no encontrado
 *       401:
 *         description: Token inválido
 *       500:
 *         description: Error del servidor
 */
router.post('/:id/disconnect', authenticate, disconnectBot);

/**
 * @swagger
 * /api/bots/{id}/verify:
 *   post:
 *     summary: Verificar y corregir estado del bot
 *     tags: [Bots]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del bot
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
 *                     fixed:
 *                       type: boolean
 *                       description: Si se corrigió automáticamente
 *                     consistent:
 *                       type: boolean
 *                       description: Si el estado era consistente
 *                     message:
 *                       type: string
 *                       description: Descripción del resultado
 *                     requiresManualRestart:
 *                       type: boolean
 *                       description: Si requiere reinicio manual
 *       404:
 *         description: Bot no encontrado
 *       401:
 *         description: Token inválido
 *       500:
 *         description: Error del servidor
 */
// router.post('/:id/verify', authenticate, verifyBotStatus);

/**
 * @swagger
 * /api/bots/{id}/diagnose:
 *   get:
 *     summary: Diagnóstico completo del estado del bot
 *     tags: [Bots]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del bot
 *     responses:
 *       200:
 *         description: Diagnóstico del bot
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
 *                     bot:
 *                       type: object
 *                       description: Información básica del bot
 *                     realTimeStatus:
 *                       type: object
 *                       description: Estado en tiempo real
 *                     connectionVerification:
 *                       type: object
 *                       description: Verificación de conexión
 *                     qrStatus:
 *                       type: object
 *                       description: Estado del QR Code
 *                     recommendations:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: Recomendaciones basadas en el diagnóstico
 *       404:
 *         description: Bot no encontrado
 *       401:
 *         description: Token inválido
 *       500:
 *         description: Error del servidor
 */
// router.get('/:id/diagnose', authenticate, diagnoseBotStatus);

/**
 * @swagger
 * /api/bots/{id}/regenerate-key:
 *   post:
 *     summary: Regenerar API Key del bot
 *     tags: [Bots]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del bot
 *     responses:
 *       200:
 *         description: API Key regenerada exitosamente
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
 *                     apiKey:
 *                       type: string
 *                     endpointUrl:
 *                       type: string
 *                     message:
 *                       type: string
 *       404:
 *         description: Bot no encontrado
 *       401:
 *         description: Token inválido
 *       500:
 *         description: Error del servidor
 */
router.post('/:id/regenerate-key', authenticate, regenerateApiKey);

/**
 * @swagger
 * /api/bots/{id}/messages:
 *   get:
 *     summary: Obtener historial de mensajes del bot
 *     tags: [Bots]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del bot
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Número de página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Mensajes por página
 *     responses:
 *       200:
 *         description: Historial de mensajes obtenido
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Message'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: number
 *                     limit:
 *                       type: number
 *                     total:
 *                       type: number
 *                     pages:
 *                       type: number
 *       404:
 *         description: Bot no encontrado
 *       401:
 *         description: Token inválido
 *       500:
 *         description: Error del servidor
 */
router.get('/:id/messages', authenticate, getBotMessages);

/**
 * @swagger
 * /api/bots/{id}:
 *   put:
 *     summary: Actualizar bot
 *     tags: [Bots]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del bot
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 50
 *               description:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 200
 *               settings:
 *                 type: object
 *                 properties:
 *                   maxMessagesPerMinute:
 *                     type: number
 *                     minimum: 1
 *                     maximum: 100
 *     responses:
 *       200:
 *         description: Bot actualizado exitosamente
 *       400:
 *         description: Datos inválidos
 *       404:
 *         description: Bot no encontrado
 *       401:
 *         description: Token inválido
 *       500:
 *         description: Error del servidor
 */
router.put('/:id', authenticate, validateBotUpdate, updateBot);

/**
 * @swagger
 * /api/bots/{id}:
 *   delete:
 *     summary: Eliminar bot
 *     tags: [Bots]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del bot
 *     responses:
 *       200:
 *         description: Bot eliminado exitosamente
 *       404:
 *         description: Bot no encontrado
 *       401:
 *         description: Token inválido
 *       500:
 *         description: Error del servidor
 */
router.delete('/:id', authenticate, deleteBot);

/**
 * @swagger
 * /api/bots/{id}/qr-public:
 *   get:
 *     summary: Obtener código QR como imagen PNG (público para demostración)
 *     tags: [Bots]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del bot
 *     responses:
 *       200:
 *         description: Imagen PNG del código QR
 *         content:
 *           image/png:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Bot ya está conectado
 *       404:
 *         description: Bot no encontrado o QR no disponible
 *       500:
 *         description: Error del servidor
 */
router.get('/:id/qr-public', getBotQRImagePublic);

module.exports = router;