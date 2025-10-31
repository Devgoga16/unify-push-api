const jwt = require('jsonwebtoken');
const User = require('../models/User');

class AuthService {
  
  // Generar JWT token
  generateToken(payload) {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET no está configurado. Configura la variable de entorno JWT_SECRET.');
    }
    
    return jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRE || '30d'
    });
  }

  // Verificar JWT token
  verifyToken(token) {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET no está configurado. Configura la variable de entorno JWT_SECRET.');
    }
    
    try {
      return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      throw new Error('Token inválido');
    }
  }

  // Registrar nuevo usuario
  async register(userData) {
    try {
      // Verificar si el usuario ya existe
      const existingUser = await User.findOne({ username: userData.username });
      if (existingUser) {
        throw new Error('El usuario ya existe con este nombre de usuario');
      }

      // Crear nuevo usuario
      const user = await User.create(userData);
      
      // Generar token
      const token = this.generateToken({
        id: user._id,
        username: user.username,
        role: user.role
      });

      return {
        success: true,
        token,
        user: {
          id: user._id,
          name: user.name,
          username: user.username,
          role: user.role,
          isActive: user.isActive
        }
      };
    } catch (error) {
      throw error;
    }
  }

  // Login de usuario
  async login(username, password) {
    try {
      // Buscar usuario por username e incluir password
      const user = await User.findOne({ username }).select('+password');
      
      if (!user) {
        throw new Error('Credenciales inválidas');
      }

      // Verificar si el usuario está activo
      if (!user.isActive) {
        throw new Error('Usuario inactivo. Contacta al administrador');
      }

      // Verificar password
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        throw new Error('Credenciales inválidas');
      }

      // Generar token
      const token = this.generateToken({
        id: user._id,
        username: user.username,
        role: user.role
      });

      return {
        success: true,
        token,
        user: {
          id: user._id,
          name: user.name,
          username: user.username,
          role: user.role,
          isActive: user.isActive
        }
      };
    } catch (error) {
      throw error;
    }
  }

  // Obtener usuario por ID desde token
  async getUserById(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('Usuario no encontrado');
      }
      
      if (!user.isActive) {
        throw new Error('Usuario inactivo');
      }

      return user;
    } catch (error) {
      throw error;
    }
  }

  // Refrescar token
  async refreshToken(oldToken) {
    try {
      const decoded = this.verifyToken(oldToken);
      const user = await this.getUserById(decoded.id);
      
      const newToken = this.generateToken({
        id: user._id,
        email: user.email,
        role: user.role
      });

      return {
        success: true,
        token: newToken,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isActive: user.isActive
        }
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new AuthService();