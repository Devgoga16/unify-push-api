const path = require('path');
const fs = require('fs').promises;

// Script para limpiar todas las sesiones de WhatsApp
async function cleanAllSessions() {
  try {
    console.log('🧹 Iniciando limpieza completa de sesiones...');
    
    const authPath = './.wwebjs_auth';
    
    // Verificar si existe el directorio
    try {
      await fs.access(authPath);
      console.log('📁 Directorio de sesiones encontrado');
    } catch {
      console.log('📁 No hay directorio de sesiones - nada que limpiar');
      return;
    }

    // Usar comando del sistema para forzar eliminación
    const { exec } = require('child_process');
    const util = require('util');
    const execPromise = util.promisify(exec);

    if (process.platform === 'win32') {
      // Windows: usar rmdir /s /q
      console.log('🗑️ Ejecutando limpieza en Windows...');
      await execPromise(`rmdir /s /q "${authPath}" 2>nul & echo Limpieza completada`);
    } else {
      // Linux/Mac: usar rm -rf
      console.log('🗑️ Ejecutando limpieza en Linux/Mac...');
      await execPromise(`rm -rf "${authPath}"`);
    }

    console.log('✅ Limpieza completa de sesiones terminada');
    console.log('🚀 Ahora puedes reiniciar el servidor sin errores EBUSY');
    
  } catch (error) {
    console.error('❌ Error en limpieza:', error.message);
    console.log('🔧 Intenta eliminar manualmente la carpeta .wwebjs_auth');
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  cleanAllSessions();
}

module.exports = { cleanAllSessions };