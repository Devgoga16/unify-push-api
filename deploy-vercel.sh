#!/bin/bash

echo "🚀 Desplegando Unify Push API en Vercel..."
echo ""

# Verificar si Vercel CLI está instalado
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI no está instalado."
    echo "Instálalo con: npm install -g vercel"
    exit 1
fi

# Verificar si está logueado
if ! vercel whoami &> /dev/null; then
    echo "❌ No estás logueado en Vercel."
    echo "Ejecuta: vercel login"
    exit 1
fi

echo "✅ Vercel CLI detectado y logueado"
echo ""

# Verificar variables de entorno críticas
echo "🔍 Verificando configuración..."

if [ -z "$MONGODB_URI" ]; then
    echo "⚠️  ADVERTENCIA: MONGODB_URI no está configurada"
    echo "   Configúrala en Vercel Dashboard → Environment Variables"
fi

if [ -z "$JWT_SECRET" ]; then
    echo "⚠️  ADVERTENCIA: JWT_SECRET no está configurada"
    echo "   Configúrala en Vercel Dashboard → Environment Variables"
fi

echo ""
echo "📋 Variables de entorno requeridas en Vercel:"
echo "   - MONGODB_URI (MongoDB Atlas)"
echo "   - JWT_SECRET (cadena segura aleatoria)"
echo "   - ADMIN_USERNAME (opcional)"
echo "   - ADMIN_PASSWORD (opcional)"
echo "   - FRONTEND_URL (tu dominio de Vercel)"
echo ""

read -p "¿Has configurado las variables de entorno en Vercel? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Configura las variables de entorno primero en Vercel Dashboard"
    echo "   https://vercel.com/dashboard → Tu proyecto → Settings → Environment Variables"
    exit 1
fi

echo ""
echo "🔧 Desplegando..."

# Desplegar
vercel --prod

echo ""
echo "✅ Despliegue completado!"
echo ""
echo "⚠️  RECORDATORIO: Esta aplicación tiene limitaciones en Vercel:"
echo "   - WebSockets no funcionan correctamente"
echo "   - WhatsApp Web.js requiere procesos persistentes"
echo "   - Considera usar Railway o Render para mejor compatibilidad"
echo ""
echo "📖 Lee VERCEL-DEPLOYMENT.md para más detalles"