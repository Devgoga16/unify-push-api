const fs = require('fs').promises;
const path = require('path');

class SessionCleanupService {
  
  // Limpiar archivos de sesión bloqueados
  async cleanupLockedSessions() {
    try {
      const authPath = './.wwebjs_auth';
      
      // Verificar si existe el directorio
      const exists = await fs.access(authPath).then(() => true).catch(() => false);
      if (!exists) {
        console.log('📁 No hay directorio de sesiones para limpiar');
        return;
      }

      // Listar sesiones
      const sessions = await fs.readdir(authPath);
      
      for (const session of sessions) {
        if (session.startsWith('session-bot_')) {
          await this.cleanupSingleSession(path.join(authPath, session));
        }
      }
      
      console.log('🧹 Limpieza de sesiones completada');
      
    } catch (error) {
      console.error('❌ Error limpiando sesiones:', error.message);
    }
  }

  // Limpiar una sesión específica
  async cleanupSingleSession(sessionPath) {
    try {
      // Intentar eliminar archivos problemáticos específicos
      const problematicFiles = [
        'Default/Cookies',
        'Default/Cookies-journal',
        'Default/Sessions',
        'Default/Sessions-journal'
      ];

      for (const file of problematicFiles) {
        const filePath = path.join(sessionPath, file);
        try {
          await fs.access(filePath);
          await fs.unlink(filePath);
          console.log(`🗑️ Eliminado: ${file}`);
        } catch (error) {
          // Archivo no existe o no se puede eliminar, continuar
        }
      }

    } catch (error) {
      console.log(`⚠️ Error limpiando sesión ${sessionPath}:`, error.message);
    }
  }

  // Forzar limpieza completa (usar con cuidado)
  async forceCleanupAllSessions() {
    try {
      const authPath = './.wwebjs_auth';
      
      // Ejecutar comando del sistema para forzar eliminación
      const { exec } = require('child_process');
      const util = require('util');
      const execPromise = util.promisify(exec);

      if (process.platform === 'win32') {
        // Windows: usar rmdir /s /q
        await execPromise(`rmdir /s /q "${authPath}" 2>nul || echo "Directorio no encontrado"`);
      } else {
        // Linux/Mac: usar rm -rf
        await execPromise(`rm -rf "${authPath}"`);
      }

      console.log('🧹 Limpieza forzada completada');
      
    } catch (error) {
      console.log(`⚠️ Limpieza forzada falló: ${error.message}`);
    }
  }
}

module.exports = new SessionCleanupService();