@echo off
title Gestor - Publicar
cd /d "%~dp0"

echo ========================================
echo  Finalizando processos anteriores...
echo ========================================
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":9000 "') do (
    if not "%%a"=="0" (
        taskkill /F /PID %%a >nul 2>&1
    )
)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3001 "') do (
    if not "%%a"=="0" (
        taskkill /F /PID %%a >nul 2>&1
    )
)
timeout /t 2 /nobreak >nul
echo.

echo ========================================
echo  Compilando Frontend (React)...
echo ========================================
cd /d "%~dp0src\client"
call npm run build
if %errorlevel% neq 0 (
    echo [ERRO] Falha ao compilar o frontend
    pause
    exit /b %errorlevel%
)
echo Frontend compilado com sucesso.
echo.


echo ========================================
echo  Compilando Servidor (Express)...
echo ========================================
cd /d "%~dp0src\server"
call npm run build
if %errorlevel% neq 0 (
    echo [ERRO] Falha ao compilar o servidor
    pause
    exit /b %errorlevel%
)
echo Servidor compilado com sucesso.
echo.

echo ========================================
echo  Iniciando Backend Go (porta 9000)...
echo ========================================
start "Gestor - Backend (Go)" /D "%~dp0..\BackEnd\Server\Go\src" cmd /k "go run main.go"

echo   Aguardando backend na porta 9000...
:wait_go
timeout /t 2 /nobreak >nul
netstat -ano | findstr ":9000 " >nul 2>&1
if errorlevel 1 goto wait_go
echo Backend Go OK.
echo.

echo ========================================
echo  Iniciando servidor em http://localhost:3001
echo  Para acessar de outra maquina, use http://IP_DESTA_MAQUINA:3001
echo  Pressione Ctrl+C para parar.
echo ========================================
cd /d "%~dp0src\server"
npm start
pause
