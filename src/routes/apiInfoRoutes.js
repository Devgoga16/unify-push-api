const express = require('express');
const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: API Info
 *   description: Información general de la API y capacidades
 */

/**
 * @swagger
 * /api/info:
 *   get:
 *     summary: Información general de la API
 *     description: |
 *       Endpoint público que proporciona información sobre las capacidades
 *       y especificaciones de la API de WhatsApp.
 *     tags: [API Info]
 *     responses:
 *       200:
 *         description: Información de la API obtenida exitosamente
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
 *                     name:
 *                       type: string
 *                       example: "Unify Push API"
 *                     version:
 *                       type: string
 *                       example: "1.0.0"
 *                     description:
 *                       type: string
 *                       example: "API para envío de mensajes WhatsApp"
 *                     endpoints:
 *                       type: object
 *                       properties:
 *                         sendMessage:
 *                           type: object
 *                           properties:
 *                             url:
 *                               type: string
 *                               example: "/api/bots/{botId}/send"
 *                             method:
 *                               type: string
 *                               example: "POST"
 *                             description:
 *                               type: string
 *                               example: "Enviar mensaje de WhatsApp"
 *                             authRequired:
 *                               type: boolean
 *                               example: true
 *                             rateLimit:
 *                               type: string
 *                               example: "60 requests/minute"
 *                         getBotStatus:
 *                           type: object
 *                           properties:
 *                             url:
 *                               type: string
 *                               example: "/api/bots/{botId}/status"
 *                             method:
 *                               type: string
 *                               example: "GET"
 *                             description:
 *                               type: string
 *                               example: "Obtener estado del bot"
 *                             authRequired:
 *                               type: boolean
 *                               example: true
 *                     authentication:
 *                       type: object
 *                       properties:
 *                         method:
 *                           type: string
 *                           example: "API Key"
 *                         header:
 *                           type: string
 *                           example: "API_KEY"
 *                         description:
 *                           type: string
 *                           example: "Incluir la API Key del bot en el header API_KEY"
 *                     messageFormats:
 *                       type: object
 *                       properties:
 *                         phoneNumber:
 *                           type: object
 *                           properties:
 *                             format:
 *                               type: string
 *                               example: "Internacional sin +"
 *                             example:
 *                               type: string
 *                               example: "51955768897"
 *                             regex:
 *                               type: string
 *                               example: "^[1-9]\\d{1,14}$"
 *                         message:
 *                           type: object
 *                           properties:
 *                             maxLength:
 *                               type: number
 *                               example: 1000
 *                             minLength:
 *                               type: number
 *                               example: 1
 *                             encoding:
 *                               type: string
 *                               example: "UTF-8"
 *                     capabilities:
 *                       type: object
 *                       properties:
 *                         textMessages:
 *                           type: boolean
 *                           example: true
 *                         mediaMessages:
 *                           type: boolean
 *                           example: true
 *                         groupMessages:
 *                           type: boolean
 *                           example: true
 *                         statusCheck:
 *                           type: boolean
 *                           example: true
 *                         realTimeStatus:
 *                           type: boolean
 *                           example: true
 *                         rateLimit:
 *                           type: boolean
 *                           example: true
 *                     limits:
 *                       type: object
 *                       properties:
 *                         requestsPerMinute:
 *                           type: number
 *                           example: 60
 *                         messageLength:
 *                           type: number
 *                           example: 1000
 *                         concurrentConnections:
 *                           type: number
 *                           example: 100
 *                     documentation:
 *                       type: object
 *                       properties:
 *                         swagger:
 *                           type: string
 *                           example: "/api-docs"
 *                         integration:
 *                           type: string
 *                           example: "/api/integration-guide"
 *                     support:
 *                       type: object
 *                       properties:
 *                         responseFormats:
 *                           type: array
 *                           items:
 *                             type: string
 *                           example: ["application/json"]
 *                         httpMethods:
 *                           type: array
 *                           items:
 *                             type: string
 *                           example: ["GET", "POST"]
 *                         encryption:
 *                           type: boolean
 *                           example: true
 */
const getApiInfo = async (req, res) => {
  try {
    const apiInfo = {
      success: true,
      data: {
        name: "Unify Push API",
        version: "1.0.0",
        description: "API profesional para envío de mensajes WhatsApp con integración empresarial",
        serverTime: new Date().toISOString(),
        endpoints: {
          sendMessage: {
            url: "/api/bots/{botId}/send",
            method: "POST",
            description: "Enviar mensaje de WhatsApp a un número específico",
            authRequired: true,
            rateLimit: "60 requests/minute",
            parameters: {
              botId: "ID único del bot en la URL",
              API_KEY: "API Key del bot en el header",
              to: "Número destinatario en formato internacional",
              message: "Contenido del mensaje (1-1000 caracteres)"
            }
          },
          getBotStatus: {
            url: "/api/bots/{botId}/status",
            method: "GET",
            description: "Verificar estado de conexión y capacidades del bot",
            authRequired: true,
            rateLimit: "No aplica",
            parameters: {
              botId: "ID único del bot en la URL",
              API_KEY: "API Key del bot en el header"
            }
          }
        },
        authentication: {
          method: "API Key",
          header: "API_KEY",
          description: "Incluir la API Key del bot en el header 'API_KEY' de la petición",
          securityLevel: "High",
          keyFormat: "bot_[32_hex_chars]"
        },
        messageFormats: {
          phoneNumber: {
            format: "Internacional sin símbolo +",
            example: "51955768897",
            regex: "^[1-9]\\d{1,14}$",
            description: "Código de país + número sin espacios ni símbolos"
          },
          message: {
            maxLength: 1000,
            minLength: 1,
            encoding: "UTF-8",
            supportedChars: "Texto, emojis, caracteres especiales",
            lineBreaks: "Permitidos"
          }
        },
        capabilities: {
          textMessages: true,
          mediaMessages: true,
          groupMessages: true,
          statusCheck: true,
          realTimeStatus: true,
          rateLimit: true,
          errorHandling: true,
          logging: true,
          concurrencyControl: true
        },
        limits: {
          requestsPerMinute: 60,
          messageLength: 1000,
          concurrentConnections: 100,
          timeoutSeconds: 30,
          retryAttempts: 3
        },
        responseFormats: {
          success: {
            structure: "{ success: true, data: {...} }",
            contentType: "application/json",
            encoding: "UTF-8"
          },
          error: {
            structure: "{ success: false, error: 'message', details?: [...] }",
            httpCodes: [400, 401, 403, 404, 429, 500],
            retryable: [429, 500]
          }
        },
        documentation: {
          swagger: "/api-docs",
          integration: "/api/integration-guide",
          examples: "/api/examples"
        },
        support: {
          responseFormats: ["application/json"],
          httpMethods: ["GET", "POST"],
          encryption: true,
          cors: true,
          compression: false,
          caching: false
        },
        status: {
          operational: true,
          uptime: process.uptime(),
          environment: process.env.NODE_ENV || "development",
          nodeVersion: process.version
        }
      }
    };

    res.status(200).json(apiInfo);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Error interno del servidor",
      message: "No se pudo obtener información de la API"
    });
  }
};

/**
 * @swagger
 * /api/integration-guide:
 *   get:
 *     summary: Guía de integración
 *     description: |
 *       Endpoint que proporciona una guía completa de integración
 *       con ejemplos de código y mejores prácticas.
 *     tags: [API Info]
 *     responses:
 *       200:
 *         description: Guía de integración obtenida exitosamente
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
 *                     title:
 *                       type: string
 *                       example: "Guía de Integración - Unify Push API"
 *                     sections:
 *                       type: array
 *                       items:
 *                         type: object
 */
const getIntegrationGuide = async (req, res) => {
  try {
    const guide = {
      success: true,
      data: {
        title: "Guía de Integración - Unify Push API",
        version: "1.0.0",
        lastUpdated: "2023-01-01",
        sections: [
          {
            title: "1. Configuración Inicial",
            description: "Pasos para configurar la integración",
            steps: [
              {
                step: 1,
                title: "Obtener credenciales",
                description: "Obtenga su Bot ID y API Key desde el panel de administración",
                example: {
                  botId: "690418b2646e2e2d8e354953",
                  apiKey: "bot_abc123def456789xyz"
                }
              },
              {
                step: 2,
                title: "Verificar estado del bot",
                description: "Antes de enviar mensajes, verifique que el bot esté conectado",
                endpoint: "GET /api/bots/{botId}/status",
                headers: {
                  "API_KEY": "bot_abc123def456789xyz",
                  "Content-Type": "application/json"
                }
              }
            ]
          },
          {
            title: "2. Envío de Mensajes",
            description: "Cómo enviar mensajes de WhatsApp",
            examples: [
              {
                language: "curl",
                title: "Ejemplo con cURL",
                code: `curl -X POST "http://localhost:3000/api/bots/690418b2646e2e2d8e354953/send" \\
  -H "API_KEY: bot_abc123def456789xyz" \\
  -H "Content-Type: application/json" \\
  -d '{
    "to": "51955768897",
    "message": "¡Hola! Este es un mensaje desde mi aplicación."
  }'`
              },
              {
                language: "javascript",
                title: "Ejemplo con JavaScript/Node.js",
                code: `const axios = require('axios');

const sendMessage = async (botId, apiKey, to, message) => {
  try {
    const response = await axios.post(
      \`http://localhost:3000/api/bots/\${botId}/send\`,
      {
        to: to,
        message: message
      },
      {
        headers: {
          'API_KEY': apiKey,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('Mensaje enviado:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error:', error.response.data);
    throw error;
  }
};

// Uso
sendMessage(
  '690418b2646e2e2d8e354953',
  'bot_abc123def456789xyz',
  '51955768897',
  '¡Hola desde mi app!'
);`
              },
              {
                language: "python",
                title: "Ejemplo con Python",
                code: `import requests
import json

def send_message(bot_id, api_key, to, message):
    url = f"http://localhost:3000/api/bots/{bot_id}/send"
    
    headers = {
        'API_KEY': api_key,
        'Content-Type': 'application/json'
    }
    
    data = {
        'to': to,
        'message': message
    }
    
    try:
        response = requests.post(url, headers=headers, json=data)
        response.raise_for_status()
        
        result = response.json()
        print(f"Mensaje enviado: {result}")
        return result
    except requests.exceptions.RequestException as e:
        print(f"Error: {e}")
        raise

# Uso
send_message(
    '690418b2646e2e2d8e354953',
    'bot_abc123def456789xyz',
    '51955768897',
    '¡Hola desde Python!'
)`
              },
              {
                language: "php",
                title: "Ejemplo con PHP",
                code: `<?php
function sendMessage($botId, $apiKey, $to, $message) {
    $url = "http://localhost:3000/api/bots/{$botId}/send";
    
    $data = array(
        'to' => $to,
        'message' => $message
    );
    
    $options = array(
        'http' => array(
            'header' => array(
                "API_KEY: {$apiKey}",
                "Content-Type: application/json"
            ),
            'method' => 'POST',
            'content' => json_encode($data)
        )
    );
    
    $context = stream_context_create($options);
    $result = file_get_contents($url, false, $context);
    
    if ($result === FALSE) {
        throw new Exception('Error enviando mensaje');
    }
    
    return json_decode($result, true);
}

// Uso
try {
    $response = sendMessage(
        '690418b2646e2e2d8e354953',
        'bot_abc123def456789xyz',
        '51955768897',
        '¡Hola desde PHP!'
    );
    echo "Mensaje enviado: " . json_encode($response);
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
?>`
              }
            ]
          },
          {
            title: "3. Verificación de Estado",
            description: "Cómo verificar el estado del bot antes de enviar mensajes",
            examples: [
              {
                language: "curl",
                title: "Verificar estado con cURL",
                code: `curl -X GET "http://localhost:3000/api/bots/690418b2646e2e2d8e354953/status" \\
  -H "API_KEY: bot_abc123def456789xyz"`
              },
              {
                language: "javascript",
                title: "Verificar estado con JavaScript",
                code: `const checkBotStatus = async (botId, apiKey) => {
  try {
    const response = await axios.get(
      \`http://localhost:3000/api/bots/\${botId}/status\`,
      {
        headers: {
          'API_KEY': apiKey
        }
      }
    );
    
    const status = response.data;
    console.log('Estado del bot:', status);
    
    // Verificar si está listo para enviar mensajes
    if (status.data.isReady) {
      console.log('✅ Bot listo para enviar mensajes');
    } else {
      console.log('❌ Bot no está listo');
    }
    
    return status;
  } catch (error) {
    console.error('Error verificando estado:', error.response.data);
    throw error;
  }
};`
              }
            ]
          },
          {
            title: "4. Manejo de Errores",
            description: "Cómo manejar diferentes tipos de errores",
            errorCodes: [
              {
                code: 400,
                title: "Bad Request",
                description: "Datos inválidos o bot no conectado",
                causes: [
                  "Número de teléfono en formato incorrecto",
                  "Mensaje vacío o muy largo",
                  "Bot no está conectado a WhatsApp"
                ],
                solution: "Verificar formato de datos y estado del bot"
              },
              {
                code: 401,
                title: "Unauthorized",
                description: "API Key inválida o faltante",
                causes: [
                  "Header API_KEY no incluido",
                  "API Key incorrecta",
                  "Bot inactivo"
                ],
                solution: "Verificar API Key y estado del bot"
              },
              {
                code: 403,
                title: "Forbidden",
                description: "Bot ID no coincide con API Key",
                causes: [
                  "Bot ID en URL no corresponde a la API Key"
                ],
                solution: "Verificar que Bot ID y API Key sean del mismo bot"
              },
              {
                code: 429,
                title: "Rate Limit Exceeded",
                description: "Demasiadas peticiones",
                causes: [
                  "Más de 60 requests por minuto"
                ],
                solution: "Implementar delays entre peticiones o usar cola de mensajes"
              },
              {
                code: 500,
                title: "Internal Server Error",
                description: "Error interno del servidor",
                causes: [
                  "Problema temporal del servidor",
                  "Error de conexión con WhatsApp"
                ],
                solution: "Reintentar después de un tiempo o contactar soporte"
              }
            ]
          },
          {
            title: "5. Mejores Prácticas",
            description: "Recomendaciones para una integración exitosa",
            practices: [
              {
                title: "Verificación previa",
                description: "Siempre verificar el estado del bot antes de enviar mensajes masivos",
                importance: "Alto"
              },
              {
                title: "Rate limiting",
                description: "Respetar el límite de 60 mensajes por minuto",
                importance: "Alto"
              },
              {
                title: "Manejo de errores",
                description: "Implementar retry logic para errores 429 y 500",
                importance: "Alto"
              },
              {
                title: "Validación de números",
                description: "Validar formato de números antes de enviar",
                importance: "Medio"
              },
              {
                title: "Logging",
                description: "Registrar todos los envíos para auditoría",
                importance: "Medio"
              },
              {
                title: "Timeouts",
                description: "Configurar timeouts apropiados (30 segundos recomendado)",
                importance: "Medio"
              }
            ]
          },
          {
            title: "6. Formatos de Respuesta",
            description: "Estructura de las respuestas de la API",
            responses: {
              success: {
                sendMessage: {
                  "success": true,
                  "data": {
                    "messageId": "false_51955768897@c.us_3EB0C4D4B7C123456789",
                    "message": "Mensaje enviado exitosamente",
                    "timestamp": "2023-01-01T12:00:00.000Z",
                    "bot": {
                      "id": "690418b2646e2e2d8e354953",
                      "name": "Mi Bot de WhatsApp",
                      "phoneNumber": "+51955768897"
                    },
                    "recipient": "51955768897",
                    "sentAt": "2023-01-01T12:00:00.000Z"
                  }
                },
                botStatus: {
                  "success": true,
                  "data": {
                    "id": "690418b2646e2e2d8e354953",
                    "name": "Mi Bot de WhatsApp",
                    "status": "connected",
                    "phoneNumber": "+51955768897",
                    "isReady": true,
                    "capabilities": {
                      "sendMessages": true,
                      "receiveMessages": true,
                      "sendMedia": true,
                      "groupMessages": true
                    }
                  }
                }
              },
              error: {
                "success": false,
                "error": "Bot no está conectado a WhatsApp",
                "botInfo": {
                  "name": "Mi Bot de WhatsApp",
                  "status": "disconnected",
                  "phoneNumber": "+51955768897"
                }
              }
            }
          }
        ],
        quickStart: {
          title: "Inicio Rápido",
          description: "Envía tu primer mensaje en menos de 5 minutos",
          steps: [
            "1. Obtén tu Bot ID y API Key del panel de control",
            "2. Verifica que tu bot esté conectado: GET /api/bots/{botId}/status",
            "3. Envía tu primer mensaje: POST /api/bots/{botId}/send",
            "4. ¡Listo! Revisa la respuesta para confirmar el envío"
          ]
        },
        support: {
          documentation: "/api-docs",
          examples: "/api/examples",
          contact: "support@unify-push.com"
        }
      }
    };

    res.status(200).json(guide);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Error interno del servidor",
      message: "No se pudo obtener la guía de integración"
    });
  }
};

router.get('/integration-guide', getIntegrationGuide);

// Estadísticas de WebSocket (solo para administradores)
const getWebSocketStats = async (req, res) => {
  try {
    // Verificar que sea administrador
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Acceso denegado',
        message: 'Solo administradores pueden ver estadísticas de WebSocket'
      });
    }

    const websocketService = require('../services/websocketService');
    const stats = websocketService.getConnectionStats();

    res.status(200).json({
      success: true,
      data: {
        websocket: stats,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Error interno del servidor",
      message: "No se pudieron obtener estadísticas de WebSocket"
    });
  }
};

/**
 * @swagger
 * /api/websocket-stats:
 *   get:
 *     summary: Estadísticas de conexiones WebSocket
 *     description: |
 *       Obtiene estadísticas de conexiones WebSocket activas.
 *       Solo disponible para administradores.
 *     tags: [API Info]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estadísticas obtenidas exitosamente
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
 *                     websocket:
 *                       type: object
 *                       properties:
 *                         connectedUsers:
 *                           type: integer
 *                           example: 2
 *                         totalSockets:
 *                           type: integer
 *                           example: 3
 *                         activeBotRooms:
 *                           type: integer
 *                           example: 1
 *                         rooms:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               botId:
 *                                 type: string
 *                               connectedSockets:
 *                                 type: integer
 *       403:
 *         description: Acceso denegado
 */
router.get('/websocket-stats', getWebSocketStats);

router.get('/info', getApiInfo);

module.exports = router;