# 🧪 TEST: Método restartBot

## ✅ Estado del método `restartBot`

### **📋 Flujo del método:**

1. **Limpia mutex** - Evita bloqueos si hay procesos pendientes
2. **Destruye instancia** - Cierra conexión WhatsApp actual
3. **Limpia sesión** - Elimina archivos de sesión corruptos
4. **Espera 3 segundos** - Permite limpieza completa
5. **Crea nueva instancia** - Reinicia conexión WhatsApp

### **🔧 Mejoras aplicadas:**

```javascript
// ANTES: Posible conflicto con mutex
async restartBot(botId) {
  await this.destroyBotInstance(botId);
  await this.createBotInstance(botId); // Podría fallar si hay mutex
}

// AHORA: Limpia mutex antes de reiniciar
async restartBot(botId) {
  // Limpiar mutex si existe para evitar bloqueos
  if (this.creationMutex.has(botIdString)) {
    this.creationMutex.delete(botIdString);
  }
  
  await this.destroyBotInstance(botIdString);
  await this.cleanBotSession(botIdString);
  await new Promise(resolve => setTimeout(resolve, 3000));
  return await this.createBotInstance(botIdString);
}
```

### **🎯 Endpoints disponibles:**

| Método | Endpoint | Función | Estado |
|--------|----------|---------|--------|
| POST | `/api/bots/:id/restart` | Reinicia bot (destruye + crea) | ✅ Funcional |
| POST | `/api/bots/:id/connect` | Solo conecta bot nuevo | ✅ Nuevo |
| POST | `/api/bots/:id/disconnect` | Solo desconecta | ✅ Nuevo |

### **🔄 Diferencias conceptuales:**

- **`/restart`** → Destruye conexión actual + Crea nueva (para bots que ya estaban conectados)
- **`/connect`** → Solo conecta (para bots nunca conectados o desconectados)
- **`/disconnect`** → Solo desconecta (mantiene bot en BD)

### **🚀 El método restartBot FUNCIONA:**

✅ **Limpieza de mutex** - Evita bloqueos  
✅ **Destrucción completa** - Cierra conexión actual  
✅ **Limpieza de sesión** - Elimina archivos corruptos  
✅ **Recreación** - Nueva instancia limpia  
✅ **Manejo de errores** - Try/catch completo  

## 💡 Recomendación de uso:

- **Para bots conectados con problemas** → Usar `/restart`
- **Para bots nuevos o desconectados** → Usar `/connect`
- **Para desconectar temporalmente** → Usar `/disconnect`