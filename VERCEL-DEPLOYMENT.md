# 🚀 Despliegue en Vercel

## ⚠️ **Limitaciones Importantes**

Esta aplicación **NO es ideal para Vercel** por las siguientes razones:

### ❌ **Problemas con Vercel:**
- **WebSockets no funcionan** (se cierran después de cada request)
- **WhatsApp Web.js requiere procesos persistentes** (Vercel es serverless)
- **Sesiones de WhatsApp se pierden** entre deployments
- **Timeout de 30 segundos** por función
- **Almacenamiento efímero** (archivos se pierden)

### ✅ **Alternativas Recomendadas:**
- **Railway** (mejor para Node.js persistente)
- **Render** (buen soporte para WebSockets)
- **Heroku** (clásico para apps Node.js)
- **DigitalOcean App Platform**
- **AWS EC2** (más control)

## 🔧 **Configuración para Vercel (Limitada)**

### 1. **Variables de Entorno en Vercel:**

Ve a tu proyecto en Vercel → Settings → Environment Variables:

```bash
# Base de datos
MONGODB_URI=mongodb+srv://usuario:password@cluster.mongodb.net/unify-push

# JWT
JWT_SECRET=tu_jwt_secret_muy_seguro_aqui

# Puerto (Vercel lo asigna automáticamente)
PORT=3000

# Entorno
NODE_ENV=production

# Usuario administrador inicial
ADMIN_USERNAME=admin
ADMIN_PASSWORD=tu_password_seguro

# URL del frontend (para CORS - aunque ahora permite cualquier origen)
FRONTEND_URL=https://tu-frontend.vercel.app
```

### 2. **CORS Configurado**

La API está configurada para **aceptar solicitudes desde cualquier origen**:

- ✅ **CORS abierto** para todas las solicitudes HTTP
- ✅ **WebSockets** permiten conexiones desde cualquier dominio
- ✅ **Credenciales** y headers personalizados permitidos
- ✅ **Métodos**: GET, POST, PUT, DELETE, PATCH, OPTIONS
- ✅ **Headers**: Content-Type, Authorization, X-Requested-With, Accept, Origin

### 3. **Desplegar:**

```bash
# Instalar Vercel CLI
npm i -g vercel

# Login
vercel login

# Desplegar
vercel

# Para producción
vercel --prod
```

### 4. **Archivos Creados:**

- `vercel.json` - Configuración de Vercel
- `api/index.js` - Punto de entrada serverless
- Scripts de build actualizados

## 🔍 **Qué Funcionará vs Qué No:**

### ✅ **Funciona:**
- API REST básica
- Autenticación JWT
- Operaciones CRUD de bots
- Documentación Swagger
- Base de datos MongoDB

### ❌ **NO Funciona:**
- WebSockets en tiempo real
- Conexiones persistentes de WhatsApp
- Sesiones de WhatsApp guardadas
- Reconexión automática
- Notificaciones push

## 🛠️ **Solución Recomendada:**

Para una aplicación completa con WhatsApp, usa **Railway** o **Render**:

### Railway (Recomendado):
```bash
# Instalar Railway CLI
npm install -g @railway/cli

# Login y deploy
railway login
railway init
railway up
```

### Render:
1. Conecta tu repo de GitHub
2. Selecciona "Web Service"
3. Configura variables de entorno

## 📞 **Soporte:**

Si necesitas ayuda con Railway/Render en lugar de Vercel, ¡házmelo saber!