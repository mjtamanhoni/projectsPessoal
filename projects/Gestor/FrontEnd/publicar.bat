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
echo  Compilando Backend Go...
echo ========================================
cd /d "%~dp0..\BackEnd\Server\Go\src"
go build -o gestor-server.exe .
if %errorlevel% neq 0 (
    echo [ERRO] Falha ao compilar o backend Go
    pause
    exit /b %errorlevel%
)
echo Backend Go compilado com sucesso.
echo.


echo ========================================
echo  Iniciando Backend Go (porta 9000)...
echo ========================================
cd /d "%~dp0..\BackEnd\Server\Go\src"
start "Gestor - Backend (Go)" cmd /k "gestor-server.exe"

echo   Aguardando backend na porta 9000...
:wait_go
timeout /t 2 /nobreak >nul
netstat -ano | findstr ":9000 " >nul 2>&1
if errorlevel 1 goto wait_go
echo Backend Go OK.
echo.

echo ========================================
echo  Iniciando BFF Express (porta 3001)...
echo ========================================
cd /d "%~dp0src\server"
start "Gestor - BFF Express" cmd /k "set HORSE_JWT_SECRET=c7f9a1b2-48d3-4e6a-9d8a-2f1e6c4a9b7d && set HORSE_API_BASE_URL=http://localhost:9000 && npm start"

echo   Aguardando BFF na porta 3001...
:wait_bff
timeout /t 2 /nobreak >nul
netstat -ano | findstr ":3001 " >nul 2>&1
if errorlevel 1 goto wait_bff
echo BFF Express OK.
echo.

echo ========================================
echo  Servidores iniciados:
echo   - Backend Go:  http://localhost:9000
echo   - BFF Express: http://localhost:3001
echo   - Frontend:    http://localhost:3001
echo ========================================
echo  Pressione Ctrl+C nas janelas dos servidores para parar.
echo ========================================
pause