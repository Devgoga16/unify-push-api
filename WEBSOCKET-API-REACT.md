# WebSocket API - Documentación para Frontend React

## 🚀 **WebSocket Implementation Completada**

La API ahora incluye **WebSockets en tiempo real** para actualizar el estado de los bots automáticamente en tu frontend React.

**⚠️ LIMITACIÓN ACTUAL:** Los WebSockets solo detectan cambios realizados a través de la API. Para cambios directos en BD, usa polling periódico.

## 📋 **Características Implementadas**

✅ **Socket.IO Server** integrado en el backend
✅ **Autenticación JWT** para conexiones WebSocket
✅ **Rooms específicas** por bot para actualizaciones dirigidas
✅ **Eventos en tiempo real** para todos los cambios de estado
✅ **Endpoint de estadísticas** para debugging
✅ **Sincronización automática** en listados de bots
✅ **Polling periódico** para detectar cambios directos en BD

---

## 🔧 **Instalación en React**

```bash
npm install socket.io-client
```

## 🔄 **Polling Periódico para Cambios en BD**

Para detectar cambios directos en la base de datos (ej: desde MongoDB Compass), implementa polling periódico:

```javascript
const POLLING_INTERVAL = 30000; // 30 segundos

const BotList = ({ jwtToken }) => {
  const [bots, setBots] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const socketRef = useRef(null);
  const pollingRef = useRef(null);

  // Función para cargar bots
  const fetchBots = async () => {
    try {
      const response = await fetch('/api/bots', {
        headers: {
          'Authorization': `Bearer ${jwtToken}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setBots(data.data);
      }
    } catch (error) {
      console.error('Error cargando bots:', error);
    }
  };

  // Iniciar polling periódico
  const startPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }
    
    pollingRef.current = setInterval(() => {
      console.log('🔄 Polling: Verificando cambios en BD...');
      fetchBots();
    }, POLLING_INTERVAL);
  };

  // Detener polling
  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  useEffect(() => {
    // ... configuración de WebSocket existente ...

    // Iniciar polling cuando el componente se monta
    startPolling();

    // Cleanup
    return () => {
      console.log('🧹 Limpiando WebSocket y polling...');
      socket.disconnect();
      socketRef.current = null;
      stopPolling();
    };
  }, [jwtToken]);

  // ... resto del código ...
};
```

### 🎯 **Ventajas del Polling:**

- ✅ **Detecta cambios directos en BD**
- ✅ **Simple de implementar**
- ✅ **Bajo overhead** (cada 30 segundos)
- ✅ **Funciona sin WebSockets**

### ⚠️ **Consideraciones:**

- **Intervalo recomendado:** 15-60 segundos
- **Ajusta según la frecuencia de cambios**
- **Considera el impacto en el servidor**

## 🔄 **Endpoint de Refresh Manual**

Para forzar una actualización inmediata (útil para desarrollo/debugging):

```javascript
// Función para refrescar manualmente
const refreshBots = async () => {
  try {
    const response = await fetch('/api/bots/refresh', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${jwtToken}`
      }
    });
    const data = await response.json();
    if (data.success) {
      console.log('✅ Bots refrescados manualmente');
      setBots(data.data); // Actualizar estado local inmediatamente
    }
  } catch (error) {
    console.error('Error refrescando bots:', error);
  }
};

// En tu componente
<button onClick={refreshBots}>
  🔄 Refrescar Estado
</button>
```

### 📡 **API Endpoint:**

```
POST /api/bots/refresh
Authorization: Bearer <jwt-token>
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Estado de bots actualizado y notificado a todos los clientes conectados",
  "count": 3,
  "data": [...]
}
```

## 📱 **Uso en React**

### 1. **Conectar al WebSocket**

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: {
    token: 'tu-jwt-token-aqui' // Token JWT del usuario autenticado
  },
  // Configuración para reconexión automática
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  timeout: 20000,
  transports: ['websocket', 'polling']
});
```

### 2. **Unirse a Room de Bot**

```javascript
// Unirse a actualizaciones de un bot específico
socket.emit('join-bot-room', '69050008605fde1e00be6704');

// Salir de la room
socket.emit('leave-bot-room', '69050008605fde1e00be6704');
```

### 3. **Solicitar Estado Actual**

```javascript
// Solicitar estado actual del bot
socket.emit('request-bot-status', '69050008605fde1e00be6704');
```

### 4. **Escuchar Eventos**

```javascript
// Estado del bot actualizado (se emite automáticamente al:
// - Obtener listado de bots
// - Obtener bot individual
// - Cambios en tiempo real del bot)
socket.on('bot-status-update', (data) => {
  console.log('Estado del bot actualizado:', data);
  /*
  data = {
    botId: '69050008605fde1e00be6704',
    database: {
      status: 'connected',
      phoneNumber: '+51966384230',
      lastActivity: '2025-10-31T18:30:17.343Z',
      qrCode: false
    },
    realTime: {
      clientExists: true,
      hasQR: false,
      isReady: true
    },
    isReady: true,
    timestamp: '2025-10-31T18:31:34.000Z'
  }
  */
});

// QR Code generado
socket.on('bot-qr-generated', (data) => {
  console.log('QR generado:', data);
  // Mostrar QR para que el usuario lo escanee
});

// Bot conectado exitosamente
socket.on('bot-connected', (data) => {
  console.log('Bot conectado:', data);
  // Actualizar UI - mostrar como conectado
});

// Bot desconectado
socket.on('bot-disconnected', (data) => {
  console.log('Bot desconectado:', data);
  // Actualizar UI - mostrar como desconectado
});

// Bot eliminado
socket.on('bot-deleted', (data) => {
  console.log('Bot eliminado:', data);
  // Remover bot de la lista local
});

// Bot removido (para todos los usuarios)
socket.on('bot-removed', (data) => {
  console.log('Bot removido del sistema:', data);
  // Actualizar listas de bots para todos los usuarios conectados
});

// Error en bot
socket.on('bot-error', (data) => {
  console.log('Error en bot:', data);
  // Mostrar notificación de error
});

// Mensaje enviado
socket.on('message-sent', (data) => {
  console.log('Mensaje enviado:', data);
  // Actualizar lista de mensajes
});

// Log de actividad
socket.on('bot-log', (data) => {
  console.log('Log del bot:', data);
  // Mostrar en consola de debug o logs
});

// Estadísticas actualizadas
socket.on('bot-stats-update', (data) => {
  console.log('Estadísticas actualizadas:', data);
  // Actualizar contadores de mensajes
});

// Mantener conexión viva
socket.on('pong', () => {
  console.log('Conexión viva');
});

// Errores
socket.on('error', (error) => {
  console.error('Error de WebSocket:', error);
  // Manejar errores de conexión
});

// Eventos de reconexión
socket.on('reconnect', (attemptNumber) => {
  console.log('Reconectado exitosamente después de', attemptNumber, 'intentos');
});

socket.on('reconnect_attempt', (attemptNumber) => {
  console.log('Intentando reconectar...', attemptNumber);
});

socket.on('reconnect_error', (error) => {
  console.error('Error de reconexión:', error);
});

socket.on('reconnect_failed', () => {
  console.error('Fallaron todos los intentos de reconexión');
});
```

---

## 🎯 **Ejemplo Completo en React**

```javascript
import React, { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';

const BotList = ({ jwtToken }) => {
  const [bots, setBots] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const socketRef = useRef(null);
  const pollingRef = useRef(null);
  
  // Configuración del polling para detectar cambios directos en BD
  const POLLING_INTERVAL = 30000; // 30 segundos

  useEffect(() => {
    // Evitar múltiples conexiones
    if (socketRef.current?.connected) {
      return;
    }

    console.log('🔌 Conectando WebSocket...');

    // Crear conexión Socket.IO
    const socket = io('http://localhost:3000', {
      auth: { token: jwtToken },
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 20000,
      transports: ['websocket', 'polling']
    });

    socketRef.current = socket;

    // Estado de conexión
    socket.on('connect', () => {
      console.log('✅ WebSocket conectado');
      setConnectionStatus('connected');
    });

    socket.on('disconnect', (reason) => {
      console.log('❌ WebSocket desconectado:', reason);
      setConnectionStatus('disconnected');
    });

    socket.on('reconnect', (attemptNumber) => {
      console.log('🔄 Reconectado después de', attemptNumber, 'intentos');
      setConnectionStatus('connected');
    });

    socket.on('reconnect_attempt', (attemptNumber) => {
      console.log('🔄 Intentando reconectar...', attemptNumber);
      setConnectionStatus('reconnecting');
    });

    socket.on('reconnect_error', (error) => {
      console.error('❌ Error de reconexión:', error);
    });

    socket.on('reconnect_failed', () => {
      console.error('❌ Fallaron todos los intentos de reconexión');
      setConnectionStatus('failed');
    });

    // Escuchar actualizaciones de estado de bots
    socket.on('bot-status-update', (data) => {
      setBots(prevBots =>
        prevBots.map(bot =>
          bot._id === data.botId
            ? {
                ...bot,
                status: data.database.status,
                phoneNumber: data.database.phoneNumber,
                lastActivity: data.database.lastActivity,
                realTimeStatus: data.realTime,
                isReady: data.isReady
              }
            : bot
        )
      );
    });

    // Escuchar cuando un bot es eliminado
    socket.on('bot-deleted', (data) => {
      console.log('Bot eliminado, removiendo de la lista:', data.botId);
      setBots(prevBots => prevBots.filter(bot => bot._id !== data.botId));
    });

    // Escuchar cuando un bot es removido del sistema (para todos los usuarios)
    socket.on('bot-removed', (data) => {
      console.log('Bot removido del sistema:', data.botId);
      setBots(prevBots => prevBots.filter(bot => bot._id !== data.botId));
    });

    // Cargar lista inicial de bots
    fetchBots();
    
    // Iniciar polling periódico para detectar cambios directos en BD
    startPolling();

    // Cleanup
    return () => {
      console.log('🧹 Limpiando WebSocket y polling...');
      socket.disconnect();
      socketRef.current = null;
      stopPolling();
    };
  }, [jwtToken]);

  // Funciones de polling para detectar cambios directos en BD
  const startPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }
    
    pollingRef.current = setInterval(() => {
      console.log('🔄 Polling: Verificando cambios en BD...');
      fetchBots();
    }, POLLING_INTERVAL);
  };

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  const fetchBots = async () => {
    try {
      const response = await fetch('/api/bots', {
        headers: {
          'Authorization': `Bearer ${jwtToken}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setBots(data.data);
        // Los WebSockets + polling mantienen el estado actualizado en tiempo real
      }
    } catch (error) {
      console.error('Error cargando bots:', error);
    }
  };

  // Función para refrescar manualmente el estado de los bots
  const refreshBots = async () => {
    try {
      console.log('🔄 Refrescando bots manualmente...');
      const response = await fetch('/api/bots/refresh', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${jwtToken}`
        }
      });
      const data = await response.json();
      if (data.success) {
        console.log('✅ Bots refrescados manualmente');
        setBots(data.data); // Actualizar estado local inmediatamente
      }
    } catch (error) {
      console.error('❌ Error refrescando bots:', error);
    }
  };

  return (
    <div className="bot-list">
      <div className="connection-status">
        Estado WebSocket: <span className={connectionStatus}>{connectionStatus}</span>
        <button onClick={refreshBots} style={{ marginLeft: '10px' }}>
          🔄 Refrescar
        </button>
      </div>

      <h2>Mis Bots WhatsApp</h2>
      {bots.map(bot => (
        <div key={bot._id} className="bot-card">
          <h3>{bot.name}</h3>
          <p>Estado: {bot.status}</p>
          <p>Teléfono: {bot.phoneNumber || 'No conectado'}</p>
          <p>Listo: {bot.isReady ? '✅' : '❌'}</p>
          <p>Última actividad: {new Date(bot.lastActivity).toLocaleString()}</p>
        </div>
      ))}
    </div>
  );
};

export default BotList;
```

---

## 📊 **Endpoint de Estadísticas**

**GET** `/api/websocket-stats` (Solo administradores)

Obtén estadísticas de conexiones WebSocket activas:

```json
{
  "success": true,
  "data": {
    "websocket": {
      "connectedUsers": 2,
      "totalSockets": 3,
      "activeBotRooms": 1,
      "rooms": [
        {
          "botId": "69050008605fde1e00be6704",
          "connectedSockets": 2
        }
      ]
    },
    "timestamp": "2025-10-31T18:31:34.000Z"
  }
}
```

---

## 🔐 **Autenticación**

- **JWT Token**: Requerido en `socket.handshake.auth.token`
- **Verificación automática**: El servidor valida el token al conectar
- **Acceso por bot**: Solo puedes unirte a rooms de bots que te pertenecen (o todos si eres admin)

---

## 🎉 **Beneficios**

✅ **Actualizaciones en tiempo real** - No más polling
✅ **Mejor UX** - Interfaz responde inmediatamente
✅ **Notificaciones push** - Alertas automáticas
✅ **Menos carga en servidor** - Una conexión WebSocket vs múltiples HTTP
✅ **Estado consistente** - UI siempre sincronizada con backend

---

## � **Integración con Listado de Bots**

Los WebSockets **NO solo se usan para el listado de bots**, sino que **complementan** el sistema completo:

### 🔄 **Flujo de Trabajo:**

1. **Carga Inicial**: Usas `GET /api/bots` (HTTP) para obtener la lista inicial
2. **Sincronización Automática**: Al cargar la lista, el backend emite `bot-status-update` para cada bot
3. **Actualizaciones en Tiempo Real**: Cualquier cambio (conexión, desconexión, envío de mensajes) se refleja automáticamente
4. **Estado Consistente**: Tu frontend siempre tiene el estado más actualizado

### 🎯 **Ejemplo Práctico:**

```javascript
// 1. Cargar lista inicial (HTTP)
const bots = await fetch('/api/bots').then(r => r.json());

// 2. WebSocket mantiene sincronizado
socket.on('bot-status-update', (update) => {
  // Actualizar automáticamente el estado del bot en la lista
  setBots(prev => prev.map(bot => 
    bot._id === update.botId ? {...bot, ...update} : bot
  ));
});
```

### 📊 **Eventos Disponibles:**

- **`bot-status-update`**: Estado actualizado (se emite en listados + cambios en tiempo real)
- **`bot-connected`**: Bot se conectó exitosamente
- **`bot-disconnected`**: Bot se desconectó
- **`bot-qr-generated`**: QR code generado para conexión
- **`bot-error`**: Error en el bot
- **`message-sent`**: Mensaje enviado exitosamente
- **`bot-log`**: Logs de actividad del bot

---

## � **Troubleshooting - Desconexiones Constantes**

Si ves logs repetitivos de conexiones/desconexiones, aquí están las posibles causas y soluciones:

### 🔍 **Posibles Causas:**

1. **JWT Token Expirado**
   ```javascript
   // Asegúrate de que el token no esté expirado
   const token = localStorage.getItem('jwt_token');
   if (!token || isTokenExpired(token)) {
     // Refrescar token o redirigir a login
   }
   ```

2. **Problemas de Red**
   - Verifica la conexión a internet
   - Firewall bloqueando WebSockets
   - Proxy interceptando conexiones

3. **Configuración Incorrecta**
   ```javascript
   // Asegúrate de usar la configuración correcta
   const socket = io('http://localhost:3000', {
     auth: { token: validToken },
     transports: ['websocket', 'polling'], // Importante: incluir polling
     timeout: 20000
   });
   ```

4. **Múltiples Instancias**
   - Evita crear múltiples conexiones Socket.IO
   - Usa un singleton para la conexión

### 🛠️ **Solución Recomendada:**

```javascript
// socketManager.js
class SocketManager {
  constructor() {
    this.socket = null;
  }

  connect(token) {
    if (this.socket?.connected) {
      return this.socket;
    }

    this.socket = io('http://localhost:3000', {
      auth: { token },
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 20000,
      transports: ['websocket', 'polling']
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export default new SocketManager();
```

### 📊 **Logs del Servidor:**

Si los logs muestran `"Reason: ping timeout"`, el problema es de conectividad. Si muestran `"Reason: transport close"`, puede ser un error de autenticación.

---

## �🚀 **Próximos Pasos**

1. **Implementa en tu React app** usando el ejemplo arriba
2. **Agrega indicadores visuales** para estados de conexión
3. **Implementa reconexión automática** si se pierde la conexión WebSocket
4. **Agrega notificaciones toast** para eventos importantes

¿Necesitas ayuda implementando algún componente específico en React?</content>
<parameter name="filePath">c:\Users\talo1\Desktop\Unify Push Proyect\WEBSOCKET-API-REACT.md