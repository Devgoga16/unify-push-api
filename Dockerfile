# Usar imagen oficial de Node.js LTS
FROM node:18-slim

# Instalar dependencias del sistema necesarias para Puppeteer y WhatsApp Web.js
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils \
    libxss1 \
    libxtst6 \
    lsb-release \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Crear directorio de la aplicación
WORKDIR /usr/src/app

# PASO 1: Copiar solo archivos de dependencias para caching
COPY package*.json ./

# PASO 2: Copiar el script de postinstall necesario
# Esto asegura que 'patch-whatsapp.js' esté disponible cuando se ejecute 'npm ci'.
COPY patch-whatsapp.js ./

# PASO 3: Instalar dependencias de producción
# Docker solo rehace este paso si package*.json o patch-whatsapp.js cambian.
RUN npm ci --only=production

# PASO 4: Copiar el resto del código fuente
# Si solo cambia el código fuente (no las dependencias), Docker reusa el cache de los pasos anteriores.
COPY . .

# Crear directorios necesarios para WhatsApp Web.js
RUN mkdir -p .wwebjs_auth .wwebjs_cache && \
    chmod -R 777 .wwebjs_auth .wwebjs_cache

# Exponer puerto
EXPOSE 3000

# Variable de entorno para Node en producción
ENV NODE_ENV=production

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Comando para iniciar la aplicación
CMD ["node", "src/app.js"]