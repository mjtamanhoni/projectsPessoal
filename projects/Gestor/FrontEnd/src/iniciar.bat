@echo off
title Gestor Financeiro Web
echo ============================================
echo  Gestor Financeiro - Web
echo ============================================
echo.
echo Instalando dependencias do Server...
cd /d "%~dp0server"
if not exist "node_modules" (
    call npm install
    if errorlevel 1 (
        echo Erro ao instalar dependencias do server
        pause
        exit /b 1
    )
)
echo.
echo Instalando dependencias do Client...
cd /d "%~dp0client"
if not exist "node_modules" (
    call npm install
    if errorlevel 1 (
        echo Erro ao instalar dependencias do client
        pause
        exit /b 1
    )
)
echo.
echo ============================================
echo  Iniciando servidores...
echo ============================================
echo.
echo  Server (BFF):   http://localhost:3001
echo  Client (React): http://localhost:5173
echo.
echo  Pressione Ctrl+C em cada janela para parar
echo ============================================
echo.
start "Gestor Financeiro - Server" cmd /k "cd /d "%~dp0server" && npm run dev"
start "Gestor Financeiro - Client" cmd /k "cd /d "%~dp0client" && npm run dev"
echo.
echo Servidores iniciados em janelas separadas.
echo Pressione qualquer tecla para fechar esta janela...
pause >nul
