const User = require('../models/User');

const createAdminUser = async () => {
  try {
    // Verificar si ya existe un usuario admin
    const existingAdmin = await User.findOne({ username: 'admin' });
    
    if (!existingAdmin) {
      // Crear usuario administrador
      const adminUser = await User.create({
        name: 'Administrador',
        username: 'admin',
        password: 'admin123',
        role: 'admin'
      });
      
      console.log('👤 Usuario administrador creado exitosamente');
      console.log('📋 Credenciales:');
      console.log('   Username: admin');
      console.log('   Password: admin123');
    } else {
      console.log('👤 Usuario administrador ya existe');
    }
  } catch (error) {
    console.error('❌ Error creando usuario administrador:', error.message);
  }
};

module.exports = {
  createAdminUser
};