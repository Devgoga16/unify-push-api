# 🚀 Unify Push API - Integración Externa

## 📋 Resumen

Esta API está lista para ser utilizada por aplicaciones externas para enviar mensajes de WhatsApp de forma programática. La autenticación se realiza mediante API Key en el header, proporcionando seguridad y facilidad de integración.

## 🔑 Autenticación

### Formato de Petición
```
URL: http://localhost:3000/api/bots/{BOT_ID}/send
Method: POST
Headers:
  - API_KEY: tu_api_key_aqui
  - Content-Type: application/json
```

### Ejemplo Completo
```bash
curl -X POST "http://localhost:3000/api/bots/690418b2646e2e2d8e354953/send" \
  -H "API_KEY: bot_abc123def456789xyz" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "51955768897",
    "message": "¡Hola! Este es un mensaje desde mi aplicación."
  }'
```

## 📍 Endpoints Principales

### 1. Envío de Mensajes
- **URL**: `POST /api/bots/{botId}/send`
- **Autenticación**: API_KEY en header
- **Rate Limit**: 60 requests/minuto
- **Timeout**: 30 segundos

#### Parámetros
| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| botId | string | Sí | ID del bot (en URL) |
| API_KEY | string | Sí | API Key del bot (en header) |
| to | string | Sí | Número en formato internacional sin + |
| message | string | Sí | Mensaje (1-1000 caracteres) |

#### Respuesta Exitosa (200)
```json
{
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
}
```

### 2. Verificación de Estado
- **URL**: `GET /api/bots/{botId}/status`
- **Autenticación**: API_KEY en header

#### Respuesta Exitosa (200)
```json
{
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
    },
    "realTimeStatus": {
      "connected": true,
      "clientExists": true,
      "isReady": true
    }
  }
}
```

## 🔧 Ejemplos de Integración

### JavaScript/Node.js
```javascript
const axios = require('axios');

class UnifyPushClient {
  constructor(botId, apiKey, baseUrl = 'http://localhost:3000') {
    this.botId = botId;
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  async sendMessage(to, message) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/api/bots/${this.botId}/send`,
        { to, message },
        {
          headers: {
            'API_KEY': this.apiKey,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );
      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(`API Error: ${error.response.data.error}`);
      }
      throw error;
    }
  }

  async checkStatus() {
    try {
      const response = await axios.get(
        `${this.baseUrl}/api/bots/${this.botId}/status`,
        {
          headers: { 'API_KEY': this.apiKey },
          timeout: 10000
        }
      );
      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(`API Error: ${error.response.data.error}`);
      }
      throw error;
    }
  }

  async isReady() {
    try {
      const status = await this.checkStatus();
      return status.data.isReady;
    } catch (error) {
      return false;
    }
  }
}

// Uso
const client = new UnifyPushClient(
  '690418b2646e2e2d8e354953',
  'bot_abc123def456789xyz'
);

// Verificar estado antes de enviar
const ready = await client.isReady();
if (ready) {
  const result = await client.sendMessage('51955768897', 'Hola desde Node.js!');
  console.log('Mensaje enviado:', result);
} else {
  console.log('Bot no está listo');
}
```

### Python
```python
import requests
import time
from typing import Dict, Any, Optional

class UnifyPushClient:
    def __init__(self, bot_id: str, api_key: str, base_url: str = 'http://localhost:3000'):
        self.bot_id = bot_id
        self.api_key = api_key
        self.base_url = base_url
        self.headers = {
            'API_KEY': api_key,
            'Content-Type': 'application/json'
        }

    def send_message(self, to: str, message: str) -> Dict[str, Any]:
        """Enviar mensaje de WhatsApp"""
        url = f"{self.base_url}/api/bots/{self.bot_id}/send"
        data = {'to': to, 'message': message}
        
        response = requests.post(url, json=data, headers=self.headers, timeout=30)
        
        if response.status_code == 429:
            # Rate limit - esperar y reintentar
            time.sleep(60)
            response = requests.post(url, json=data, headers=self.headers, timeout=30)
        
        response.raise_for_status()
        return response.json()

    def check_status(self) -> Dict[str, Any]:
        """Verificar estado del bot"""
        url = f"{self.base_url}/api/bots/{self.bot_id}/status"
        response = requests.get(url, headers=self.headers, timeout=10)
        response.raise_for_status()
        return response.json()

    def is_ready(self) -> bool:
        """Verificar si el bot está listo para enviar mensajes"""
        try:
            status = self.check_status()
            return status['data']['isReady']
        except:
            return False

    def send_with_retry(self, to: str, message: str, max_retries: int = 3) -> Optional[Dict[str, Any]]:
        """Enviar mensaje con reintentos automáticos"""
        for attempt in range(max_retries):
            try:
                if not self.is_ready():
                    print(f"Bot no está listo, intento {attempt + 1}")
                    time.sleep(5)
                    continue
                
                result = self.send_message(to, message)
                return result
                
            except requests.exceptions.RequestException as e:
                print(f"Error en intento {attempt + 1}: {e}")
                if attempt < max_retries - 1:
                    time.sleep(2 ** attempt)  # Backoff exponencial
                else:
                    raise
        
        return None

# Uso
client = UnifyPushClient(
    '690418b2646e2e2d8e354953',
    'bot_abc123def456789xyz'
)

# Envío simple
try:
    result = client.send_message('51955768897', '¡Hola desde Python!')
    print(f"Mensaje enviado: {result['data']['messageId']}")
except requests.exceptions.RequestException as e:
    print(f"Error: {e}")

# Envío con reintentos
result = client.send_with_retry('51955768897', 'Mensaje con reintentos')
if result:
    print("Mensaje enviado exitosamente")
else:
    print("No se pudo enviar el mensaje")
```

### PHP
```php
<?php
class UnifyPushClient {
    private $botId;
    private $apiKey;
    private $baseUrl;
    
    public function __construct($botId, $apiKey, $baseUrl = 'http://localhost:3000') {
        $this->botId = $botId;
        $this->apiKey = $apiKey;
        $this->baseUrl = $baseUrl;
    }
    
    public function sendMessage($to, $message) {
        $url = "{$this->baseUrl}/api/bots/{$this->botId}/send";
        
        $data = json_encode([
            'to' => $to,
            'message' => $message
        ]);
        
        $context = stream_context_create([
            'http' => [
                'method' => 'POST',
                'header' => [
                    "API_KEY: {$this->apiKey}",
                    "Content-Type: application/json"
                ],
                'content' => $data,
                'timeout' => 30
            ]
        ]);
        
        $result = file_get_contents($url, false, $context);
        
        if ($result === false) {
            throw new Exception('Error enviando mensaje');
        }
        
        return json_decode($result, true);
    }
    
    public function checkStatus() {
        $url = "{$this->baseUrl}/api/bots/{$this->botId}/status";
        
        $context = stream_context_create([
            'http' => [
                'method' => 'GET',
                'header' => "API_KEY: {$this->apiKey}",
                'timeout' => 10
            ]
        ]);
        
        $result = file_get_contents($url, false, $context);
        
        if ($result === false) {
            throw new Exception('Error verificando estado');
        }
        
        return json_decode($result, true);
    }
    
    public function isReady() {
        try {
            $status = $this->checkStatus();
            return $status['data']['isReady'] ?? false;
        } catch (Exception $e) {
            return false;
        }
    }
}

// Uso
$client = new UnifyPushClient(
    '690418b2646e2e2d8e354953',
    'bot_abc123def456789xyz'
);

try {
    if ($client->isReady()) {
        $result = $client->sendMessage('51955768897', '¡Hola desde PHP!');
        echo "Mensaje enviado: " . $result['data']['messageId'];
    } else {
        echo "Bot no está listo";
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
?>
```

## ⚠️ Códigos de Error

| Código | Descripción | Solución |
|--------|-------------|----------|
| 400 | Datos inválidos o bot desconectado | Verificar formato y estado del bot |
| 401 | API Key inválida | Verificar API Key |
| 403 | Bot ID no coincide con API Key | Verificar correspondencia |
| 429 | Rate limit excedido | Esperar 60 segundos |
| 500 | Error interno | Reintentar o contactar soporte |

## 🎯 Mejores Prácticas

1. **Verificación previa**: Siempre verificar `isReady` antes de enviar mensajes masivos
2. **Rate limiting**: Respetar el límite de 60 mensajes/minuto
3. **Manejo de errores**: Implementar retry logic para errores 429 y 500
4. **Validación**: Validar formato de números telefónicos
5. **Timeouts**: Configurar timeouts apropiados (30s para envío, 10s para status)
6. **Logging**: Registrar todos los envíos para auditoría

## 📚 Documentación Adicional

- **Swagger UI**: http://localhost:3000/api-docs
- **Información de la API**: GET /api/info
- **Guía de integración**: GET /api/integration-guide

## 🆘 Soporte

Para soporte técnico o preguntas sobre la integración, contacta al equipo de desarrollo.