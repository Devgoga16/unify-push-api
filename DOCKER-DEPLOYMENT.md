# 🐳 Despliegue con Docker

Esta aplicación incluye configuración completa de Docker para facilitar el despliegue.

## 📋 **Requisitos**

- Docker Engine 20.10+
- Docker Compose 2.0+

## 🚀 **Inicio Rápido**

### **Opción 1: Docker Compose (Recomendado)**

Levanta toda la infraestructura (API + MongoDB) con un solo comando:

```bash
# Construir y levantar servicios
docker-compose up -d

# Ver logs
docker-compose logs -f

# Detener servicios
docker-compose down

# Detener y eliminar volúmenes (⚠️ elimina datos)
docker-compose down -v
```

La API estará disponible en `http://localhost:3000`

### **Opción 2: Solo Docker (API)**

Si ya tienes MongoDB corriendo:

```bash
# Construir imagen
docker build -t unify-push-api .

# Ejecutar contenedor
docker run -d \
  --name unify-push-api \
  -p 3000:3000 \
  -e MONGODB_URI=mongodb://tu-mongodb:27017/unify-push \
  -e JWT_SECRET=tu-secret-super-seguro \
  -e ADMIN_USERNAME=admin \
  -e ADMIN_PASSWORD=admin123 \
  -v $(pwd)/.wwebjs_auth:/usr/src/app/.wwebjs_auth \
  -v $(pwd)/.wwebjs_cache:/usr/src/app/.wwebjs_cache \
  unify-push-api

# Ver logs
docker logs -f unify-push-api

# Detener
docker stop unify-push-api
docker rm unify-push-api
```

## 🔧 **Variables de Entorno**

Edita las variables en `docker-compose.yml` antes de desplegar:

```yaml
environment:
  NODE_ENV: production
  PORT: 3000
  API_URL: http://localhost:3000
  MONGODB_URI: mongodb://admin:changeme123@mongodb:27017/unify-push?authSource=admin
  JWT_SECRET: cambia-esto-por-un-secret-super-largo-y-seguro
  JWT_EXPIRE: 30d
  ADMIN_USERNAME: admin
  ADMIN_PASSWORD: cambia-esto-por-un-password-seguro
  FRONTEND_URL: http://tu-frontend.com
```

## 📦 **Volúmenes Persistentes**

Docker Compose crea volúmenes para persistir datos:

- `mongodb_data` - Base de datos MongoDB
- `mongodb_config` - Configuración de MongoDB
- `whatsapp_sessions` - Sesiones de WhatsApp (`.wwebjs_auth`)
- `whatsapp_cache` - Cache de WhatsApp (`.wwebjs_cache`)

### Ver volúmenes:
```bash
docker volume ls
```

### Backup de volúmenes:
```bash
# Backup de sesiones de WhatsApp
docker run --rm -v unify-push-api_whatsapp_sessions:/data -v $(pwd):/backup alpine tar czf /backup/whatsapp-sessions-backup.tar.gz -C /data .

# Backup de MongoDB
docker run --rm -v unify-push-api_mongodb_data:/data -v $(pwd):/backup alpine tar czf /backup/mongodb-backup.tar.gz -C /data .
```

## 🏗️ **Arquitectura**

```
┌─────────────────┐
│   Frontend      │
│   (React)       │
└────────┬────────┘
         │
         ↓
┌─────────────────┐     ┌──────────────┐
│   API Service   │────→│   MongoDB    │
│   (Node.js)     │     │   Database   │
│   Port: 3000    │     │   Port:27017 │
└─────────────────┘     └──────────────┘
         │
         ↓
┌─────────────────┐
│   WhatsApp      │
│   Sessions      │
│   (Volumes)     │
└─────────────────┘
```

## 🔍 **Comandos Útiles**

```bash
# Ver servicios corriendo
docker-compose ps

# Ver logs en tiempo real
docker-compose logs -f api
docker-compose logs -f mongodb

# Reiniciar un servicio
docker-compose restart api

# Reconstruir después de cambios
docker-compose up -d --build

# Ejecutar comandos dentro del contenedor
docker-compose exec api sh
docker-compose exec mongodb mongosh

# Ver recursos utilizados
docker stats

# Limpiar recursos no utilizados
docker system prune -a
```

## 🏥 **Health Checks**

Ambos servicios incluyen health checks automáticos:

### API:
- **Intervalo**: 30 segundos
- **Timeout**: 10 segundos
- **Start period**: 40 segundos
- **Reintentos**: 3

### MongoDB:
- **Intervalo**: 10 segundos
- **Timeout**: 5 segundos
- **Reintentos**: 5

Ver estado:
```bash
docker-compose ps
```

## 🔐 **Seguridad**

### Para Producción:

1. **Cambia las credenciales por defecto**:
   - MongoDB: `MONGO_INITDB_ROOT_PASSWORD`
   - Admin: `ADMIN_USERNAME` y `ADMIN_PASSWORD`
   - JWT: `JWT_SECRET` (mínimo 128 caracteres)

2. **No expongas MongoDB** (elimina `ports` en `docker-compose.yml`):
   ```yaml
   mongodb:
     # ports:
     #   - "27017:27017"  # Comentar esta línea
   ```

3. **Usa variables de entorno externas**:
   ```bash
   # Crear archivo .env
   cat > .env << EOF
   MONGODB_URI=mongodb://...
   JWT_SECRET=...
   ADMIN_PASSWORD=...
   EOF
   
   # Ejecutar con variables del archivo
   docker-compose --env-file .env up -d
   ```

## 🌐 **Despliegue en Servidor**

### Con Docker instalado:

```bash
# 1. Clonar repositorio
git clone <tu-repo>
cd unify-push-api

# 2. Configurar variables
nano docker-compose.yml

# 3. Levantar servicios
docker-compose up -d

# 4. Verificar
curl http://localhost:3000
```

### Con Docker Swarm:

```bash
docker swarm init
docker stack deploy -c docker-compose.yml unify-push
docker stack services unify-push
```

## 📊 **Monitoreo**

```bash
# Logs en tiempo real
docker-compose logs -f

# Estado de servicios
docker-compose ps

# Recursos
docker stats

# Inspeccionar red
docker network inspect unify-push-api_unify-network
```

## 🐛 **Troubleshooting**

### La API no se conecta a MongoDB:
```bash
# Verificar que MongoDB esté corriendo
docker-compose ps mongodb

# Ver logs de MongoDB
docker-compose logs mongodb

# Probar conexión
docker-compose exec mongodb mongosh -u admin -p changeme123
```

### Sesiones de WhatsApp se pierden:
```bash
# Verificar volúmenes
docker volume ls | grep whatsapp

# Ver contenido del volumen
docker run --rm -v unify-push-api_whatsapp_sessions:/data alpine ls -la /data
```

### Contenedor se reinicia constantemente:
```bash
# Ver logs detallados
docker-compose logs --tail=100 api

# Ver último error
docker-compose logs api | tail -50
```

## 📞 **Soporte**

Para más información sobre Docker:
- [Documentación oficial de Docker](https://docs.docker.com/)
- [Docker Compose Reference](https://docs.docker.com/compose/)
