const authService = require('../services/authService');
const { validationResult } = require('express-validator');

// Registrar nuevo usuario
const register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Datos de entrada inválidos',
        details: errors.array()
      });
    }

    const result = await authService.register(req.body);
    
    res.status(201).json(result);
  } catch (error) {
    if (error.message === 'El usuario ya existe con este nombre de usuario') {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }
    next(error);
  }
};

// Login de usuario
const login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Datos de entrada inválidos',
        details: errors.array()
      });
    }

    const { username, password } = req.body;
    const result = await authService.login(username, password);
    
    res.status(200).json(result);
  } catch (error) {
    if (error.message.includes('Credenciales inválidas') || error.message.includes('Usuario inactivo')) {
      return res.status(401).json({
        success: false,
        error: error.message
      });
    }
    next(error);
  }
};

// Obtener perfil del usuario actual
const getProfile = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      data: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        isActive: req.user.isActive,
        createdAt: req.user.createdAt,
        updatedAt: req.user.updatedAt
      }
    });
  } catch (error) {
    next(error);
  }
};

// Refrescar token
const refreshToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Token requerido'
      });
    }

    const result = await authService.refreshToken(token);
    
    res.status(200).json(result);
  } catch (error) {
    if (error.message === 'Token inválido' || error.message === 'Usuario no encontrado') {
      return res.status(401).json({
        success: false,
        error: error.message
      });
    }
    next(error);
  }
};

// Logout (simplemente respuesta de éxito, el cliente debe eliminar el token)
const logout = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      message: 'Logout exitoso'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  getProfile,
  refreshToken,
  logout
};