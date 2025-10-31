@echo off
echo 🚀 Desplegando Unify Push API en Vercel...
echo.

:: Verificar si Vercel CLI está instalado
vercel --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Vercel CLI no está instalado.
    echo Instálalo con: npm install -g vercel
    pause
    exit /b 1
)

:: Verificar si está logueado
vercel whoami >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ No estás logueado en Vercel.
    echo Ejecuta: vercel login
    pause
    exit /b 1
)

echo ✅ Vercel CLI detectado y logueado
echo.
echo 🔍 Verificando configuración...
echo.
echo 📋 Variables de entorno requeridas en Vercel:
echo    - MONGODB_URI (MongoDB Atlas)
echo    - JWT_SECRET (cadena segura aleatoria)
echo    - ADMIN_USERNAME (opcional)
echo    - ADMIN_PASSWORD (opcional)
echo    - FRONTEND_URL (tu dominio de Vercel)
echo.

set /p confirm="¿Has configurado las variables de entorno en Vercel? (y/N): "
if /i not "%confirm%"=="y" (
    echo ❌ Configura las variables de entorno primero en Vercel Dashboard
    echo    https://vercel.com/dashboard → Tu proyecto → Settings → Environment Variables
    pause
    exit /b 1
)

echo.
echo 🔧 Desplegando...
echo.

:: Desplegar
vercel --prod

echo.
echo ✅ Despliegue completado!
echo.
echo ⚠️  RECORDATORIO: Esta aplicación tiene limitaciones en Vercel:
echo    - WebSockets no funcionan correctamente
echo    - WhatsApp Web.js requiere procesos persistentes
echo    - Considera usar Railway o Render para mejor compatibilidad
echo.
echo 📖 Lee VERCEL-DEPLOYMENT.md para más detalles
echo.
pause