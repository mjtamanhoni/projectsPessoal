@echo off
title Gestor - Atualizar (PROD)
cd /d "%~dp0"

echo ========================================
echo  Atualizando PROD (git pull + rebuild)
echo ========================================
git pull
if %errorlevel% neq 0 (
    echo [ERRO] Falha no git pull
    pause
    exit /b %errorlevel%
)
echo.
call "%~dp0FrontEnd\publicar.bat"
