# Unify Push API

Backend API desarrollado con Node.js, Express.js y MongoDB, incluye documentación con Swagger.

## 🚀 Características

- **Express.js** - Framework web rápido y minimalista
- **MongoDB** - Base de datos NoSQL con Mongoose ODM
- **Swagger UI** - Documentación interactiva de la API
- **JWT Authentication** - Autenticación segura con tokens
- **Validation** - Validación de datos con express-validator
- **Security** - Middleware de seguridad con Helmet
- **CORS** - Configuración de Cross-Origin Resource Sharing (permite cualquier origen)
- **Error Handling** - Manejo centralizado de errores
- **WebSockets** - Comunicación en tiempo real con Socket.IO
- **WhatsApp Integration** - Integración con WhatsApp Web.js

## 📋 Requisitos previos

- Node.js (versión 14 o superior)
- MongoDB (local o en la nube)
- npm o yarn

## 🛠️ Instalación

1. Clona el repositorio:
```bash
git clone <url-del-repositorio>
cd unify-push-api
```

2. Instala las dependencias:
```bash
npm install
```

3. Configura las variables de entorno:
```bash
cp .env.example .env
```
Edita el archivo `.env` con tus configuraciones.

4. Inicia el servidor:
```bash
# Desarrollo (con nodemon)
npm run dev

# Producción
npm start
```

## 🚀 Despliegue

### Docker (Recomendado)

La forma más fácil de desplegar la aplicación:

```bash
# Con Docker Compose (API + MongoDB)
docker-compose up -d

# Solo la API (necesitas MongoDB aparte)
docker build -t unify-push-api .
docker run -d -p 3000:3000 --env-file .env unify-push-api
```

Lee `DOCKER-DEPLOYMENT.md` para guía completa de Docker.

### Vercel (Limitado)
⚠️ **Nota**: Vercel no es ideal para esta aplicación debido a limitaciones con WebSockets y procesos persistentes.

```bash
# Despliegue rápido (Windows)
deploy-vercel.cmd

# O manualmente
vercel --prod
```

**Limitaciones en Vercel:**
- WebSockets no funcionan correctamente
- WhatsApp Web.js requiere procesos persistentes
- Sesiones se pierden entre deployments

### Alternativas Recomendadas

Para un despliegue completo, usa:

#### Railway (Recomendado)
```bash
npm install -g @railway/cli
railway login
railway init
railway up
```

#### Render
1. Conecta tu repo de GitHub
2. Selecciona "Web Service"
3. Configura variables de entorno

#### Heroku
```bash
heroku create
git push heroku main
```

Lee `VERCEL-DEPLOYMENT.md` para más detalles sobre configuración.

## 📚 Documentación de la API

## 📋 Requisitos previos

- Node.js (versión 14 o superior)
- MongoDB (local o en la nube)
- npm o yarn

## 🛠️ Instalación

1. Clona el repositorio:
```bash
git clone <url-del-repositorio>
cd unify-push-api
```

2. Instala las dependencias:
```bash
npm install
```

3. Configura las variables de entorno:
```bash
cp .env.example .env
```
Edita el archivo `.env` con tus configuraciones.

4. Inicia el servidor:
```bash
# Desarrollo (con nodemon)
npm run dev

# Producción
npm start
```

## 📚 Documentación de la API

Una vez que el servidor esté ejecutándose, puedes acceder a la documentación de Swagger en:

```
http://localhost:3000/api-docs
```

## 📁 Estructura del proyecto

```
src/
├── config/         # Configuraciones (database, swagger)
├── controllers/    # Controladores de la lógica de negocio
├── middleware/     # Middlewares personalizados
├── models/         # Modelos de Mongoose
├── routes/         # Definición de rutas
└── app.js         # Punto de entrada de la aplicación
```

## 🔧 Scripts disponibles

- `npm start` - Inicia el servidor en modo producción
- `npm run dev` - Inicia el servidor en modo desarrollo con nodemon
- `npm test` - Ejecuta las pruebas

## 🔒 Variables de entorno

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `NODE_ENV` | Entorno de ejecución | `development` |
| `PORT` | Puerto del servidor | `3000` |
| `MONGODB_URI` | URI de conexión a MongoDB | `mongodb://localhost:27017/unify_push_db` |
| `JWT_SECRET` | Secreto para JWT | `tu_jwt_secret_muy_seguro` |
| `JWT_EXPIRE` | Tiempo de expiración del JWT | `30d` |

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia ISC.