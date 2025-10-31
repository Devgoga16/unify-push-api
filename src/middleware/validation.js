const { body } = require('express-validator');

// Validaciones para usuarios
const validateUserCreate = [
  body('name')
    .notEmpty()
    .withMessage('El nombre es requerido')
    .isLength({ min: 2, max: 50 })
    .withMessage('El nombre debe tener entre 2 y 50 caracteres')
    .trim(),
  
  body('username')
    .notEmpty()
    .withMessage('El nombre de usuario es requerido')
    .isLength({ min: 3, max: 20 })
    .withMessage('El nombre de usuario debe tener entre 3 y 20 caracteres')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('El nombre de usuario solo puede contener letras, números y guiones bajos')
    .toLowerCase(),

  body('password')
    .optional()
    .isLength({ min: 6 })
    .withMessage('La contraseña debe tener al menos 6 caracteres')
];

const validateUserUpdate = [
  body('name')
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage('El nombre debe tener entre 2 y 50 caracteres')
    .trim(),
  
  body('username')
    .optional()
    .isLength({ min: 3, max: 20 })
    .withMessage('El nombre de usuario debe tener entre 3 y 20 caracteres')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('El nombre de usuario solo puede contener letras, números y guiones bajos')
    .toLowerCase()
];

// Validaciones para autenticación
const validateRegister = [
  body('name')
    .notEmpty()
    .withMessage('El nombre es requerido')
    .isLength({ min: 2, max: 50 })
    .withMessage('El nombre debe tener entre 2 y 50 caracteres')
    .trim(),
  
  body('username')
    .notEmpty()
    .withMessage('El nombre de usuario es requerido')
    .isLength({ min: 3, max: 20 })
    .withMessage('El nombre de usuario debe tener entre 3 y 20 caracteres')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('El nombre de usuario solo puede contener letras, números y guiones bajos')
    .toLowerCase(),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('La contraseña debe tener al menos 6 caracteres')
];

const validateLogin = [
  body('username')
    .notEmpty()
    .withMessage('El nombre de usuario es requerido')
    .isLength({ min: 3, max: 20 })
    .withMessage('El nombre de usuario debe tener entre 3 y 20 caracteres')
    .toLowerCase(),
  
  body('password')
    .notEmpty()
    .withMessage('La contraseña es requerida')
];

// Validaciones para bots
const validateBotCreate = [
  body('name')
    .notEmpty()
    .withMessage('El nombre del bot es requerido')
    .isLength({ min: 3, max: 50 })
    .withMessage('El nombre debe tener entre 3 y 50 caracteres')
    .trim(),
  
  body('description')
    .notEmpty()
    .withMessage('La descripción es requerida')
    .isLength({ min: 10, max: 200 })
    .withMessage('La descripción debe tener entre 10 y 200 caracteres')
    .trim()
];

const validateBotUpdate = [
  body('name')
    .optional()
    .isLength({ min: 3, max: 50 })
    .withMessage('El nombre debe tener entre 3 y 50 caracteres')
    .trim(),
  
  body('description')
    .optional()
    .isLength({ min: 10, max: 200 })
    .withMessage('La descripción debe tener entre 10 y 200 caracteres')
    .trim(),

  body('settings.maxMessagesPerMinute')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Máximo de mensajes por minuto debe estar entre 1 y 100')
];

// Validaciones para mensajes
const validateMessage = [
  body('to')
    .notEmpty()
    .withMessage('El número destinatario es requerido')
    .matches(/^[1-9]\d{1,14}$/)
    .withMessage('Formato de número inválido. Use formato internacional sin + (ej: 51955768897)'),
  
  body('message')
    .notEmpty()
    .withMessage('El mensaje es requerido')
    .isLength({ min: 1, max: 1000 })
    .withMessage('El mensaje debe tener entre 1 y 1000 caracteres')
];

module.exports = {
  validateUserCreate,
  validateUserUpdate,
  validateRegister,
  validateLogin,
  validateBotCreate,
  validateBotUpdate,
  validateMessage
};