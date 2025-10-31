const fs = require('fs');
const path = require('path');

// Script para parchear WhatsApp Web.js y evitar errores EBUSY
function patchWhatsAppWebJS() {
  try {
    console.log('🔧 Aplicando parche a WhatsApp Web.js para evitar errores EBUSY...');
    
    const localAuthPath = path.join(__dirname, 'node_modules', 'whatsapp-web.js', 'src', 'authStrategies', 'LocalAuth.js');
    
    // Verificar si el archivo existe
    if (!fs.existsSync(localAuthPath)) {
      console.log('❌ Archivo LocalAuth.js no encontrado');
      return;
    }
    
    // Leer el archivo
    let content = fs.readFileSync(localAuthPath, 'utf8');
    
    // Verificar si ya está parcheado
    if (content.includes('LocalAuth.logout() bypassed para evitar EBUSY')) {
      console.log('✅ WhatsApp Web.js ya está parcheado');
      return;
    }
    
    // Aplicar el parche
    const originalLogout = `    async logout() {
        if (this.userDataDir) {
            await fs.promises.rm(this.userDataDir, { recursive: true, force: true, maxRetries: this.rmMaxRetries })
                .catch((e) => {
                    throw new Error(e);
                });
        }
    }`;
    
    const patchedLogout = `    async logout() {
        // PATCH: Comentado para evitar error EBUSY
        // El error ocurre porque los archivos están en uso por Chrome
        console.log('🔧 LocalAuth.logout() bypassed para evitar EBUSY');
        
        // if (this.userDataDir) {
        //     await fs.promises.rm(this.userDataDir, { recursive: true, force: true, maxRetries: this.rmMaxRetries })
        //         .catch((e) => {
        //             throw new Error(e);
        //         });
        // }
    }`;
    
    // Reemplazar el método logout
    content = content.replace(originalLogout, patchedLogout);
    
    // Escribir el archivo parcheado
    fs.writeFileSync(localAuthPath, content, 'utf8');
    
    console.log('✅ Parche aplicado exitosamente a WhatsApp Web.js');
    console.log('🚀 Los errores EBUSY deberían estar resueltos');
    
  } catch (error) {
    console.error('❌ Error aplicando parche:', error.message);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  patchWhatsAppWebJS();
}

module.exports = { patchWhatsAppWebJS };