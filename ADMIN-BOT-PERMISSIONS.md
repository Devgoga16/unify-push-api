# 👑 PERMISOS DE ADMINISTRADOR PARA BOTS

## ✅ **Funcionalidad Implementada**

### **📋 Acceso Total para Admins**

Los usuarios con rol `admin` ahora tienen **acceso completo** a todos los bots del sistema, no solo a los suyos.

### **🔧 Métodos Modificados**

| Endpoint | Comportamiento Admin | Comportamiento Usuario |
|----------|---------------------|----------------------|
| `GET /api/bots` | Ve **todos los bots** del sistema | Ve solo sus bots |
| `GET /api/bots/:id` | Accede a **cualquier bot** | Solo sus bots |
| `GET /api/bots/:id/qr` | QR de **cualquier bot** | Solo sus bots |
| `GET /api/bots/:id/qr-image` | Imagen QR de **cualquier bot** | Solo sus bots |
| `POST /api/bots/:id/connect` | Conecta **cualquier bot** | Solo sus bots |
| `POST /api/bots/:id/disconnect` | Desconecta **cualquier bot** | Solo sus bots |
| `POST /api/bots/:id/restart` | Reinicia **cualquier bot** | Solo sus bots |

### **📊 Información Adicional para Admins**

Cuando un admin lista bots o accede a uno específico, obtiene **información del propietario**:

```json
{
  "success": true,
  "data": [
    {
      "_id": "bot123",
      "name": "Mi Bot",
      "status": "connected",
      "ownerInfo": {
        "id": "user456",
        "name": "Juan Pérez",
        "username": "juanperez"
      },
      "endpointUrl": "https://api.example.com/api/bots/bot_abc123/send"
    }
  ],
  "scope": "all_bots"  // Indica que se están viendo todos los bots
}
```

### **🛠️ Función Auxiliar**

```javascript
// Función que determina acceso según el rol
const findBotWithAccess = async (botId, user) => {
  if (user.role === 'admin') {
    // Admin puede acceder a cualquier bot
    return await Bot.findById(botId).populate('owner', 'name username');
  } else {
    // Usuario normal solo sus propios bots
    return await Bot.findOne({ 
      _id: botId,
      owner: user._id 
    });
  }
};
```

### **🔍 Logs Mejorados**

Todos los logs ahora incluyen información del usuario y rol:

```
🚀 Conectando bot Mi Bot (bot123) - Usuario: admin (admin)
👑 Admin accediendo a bot bot123
📱 Solicitando QR para bot: bot123 (usuario: admin, rol: admin)
```

### **🎯 Casos de Uso para Admin**

1. **Soporte Técnico**: Admin puede ayudar a usuarios con problemas en sus bots
2. **Mantenimiento**: Reiniciar/desconectar bots problemáticos de cualquier usuario
3. **Monitoreo**: Ver el estado de todos los bots del sistema
4. **Gestión**: Acceso completo para administración del sistema

### **🔒 Seguridad**

- ✅ **Verificación de rol** en cada endpoint
- ✅ **Logging detallado** de acciones de admin
- ✅ **Información del propietario** visible para admin
- ✅ **Separación clara** entre permisos de admin y usuario

## 🧪 **Para Probar**

1. **Login como admin** → Obtener token con rol admin
2. **Listar bots** → `GET /api/bots` → Verás todos los bots del sistema
3. **Acceder a bot ajeno** → `GET /api/bots/{id_de_otro_usuario}`
4. **Conectar bot ajeno** → `POST /api/bots/{id_de_otro_usuario}/connect`

## 🎉 **Beneficios**

- ✅ **Control total** para administradores
- ✅ **Mantenimiento simplificado** del sistema
- ✅ **Soporte técnico** mejorado
- ✅ **Visibilidad completa** del estado del sistema
- ✅ **Seguridad mantenida** para usuarios normales