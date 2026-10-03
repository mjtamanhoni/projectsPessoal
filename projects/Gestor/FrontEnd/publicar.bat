@echo off
title Gestor - Publicar
cd /d "%~dp0"

REM Portas vem dos .env (GO: SERVER_PORT / BFF: PORT) - padrao 9000/3001
set GO_PORT=9000
set BFF_PORT=3001
for /f "usebackq tokens=1,* delims==" %%a in (`findstr /b "SERVER_PORT=" "..\BackEnd\Server\Go\src\.env" 2^>nul`) do set "GO_PORT=%%b"
for /f "usebackq tokens=1,* delims==" %%a in (`findstr /b /c:"PORT=" "src\server\.env" 2^>nul`) do set "BFF_PORT=%%b"

echo ========================================
echo  Finalizando processos anteriores...
echo ========================================
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%GO_PORT% "') do (
    if not "%%a"=="0" (
        taskkill /F /PID %%a >nul 2>&1
    )
)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%BFF_PORT% "') do (
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
echo  Iniciando Backend Go (porta %GO_PORT%)...
echo ========================================
cd /d "%~dp0..\BackEnd\Server\Go\src"
start "Gestor - Backend (Go)" cmd /k "gestor-server.exe"

echo   Aguardando backend na porta %GO_PORT%...
:wait_go
timeout /t 2 /nobreak >nul
netstat -ano | findstr ":%GO_PORT% " >nul 2>&1
if errorlevel 1 goto wait_go
echo Backend Go OK.
echo.

echo ========================================
echo  Iniciando BFF Express (porta %BFF_PORT%)...
echo ========================================
cd /d "%~dp0src\server"
start "Gestor - BFF Express" cmd /k "npm start"

echo   Aguardando BFF na porta %BFF_PORT%...
:wait_bff
timeout /t 2 /nobreak >nul
netstat -ano | findstr ":%BFF_PORT% " >nul 2>&1
if errorlevel 1 goto wait_bff
echo BFF Express OK.
echo.

echo ========================================
echo  Servidores iniciados:
echo   - Backend Go:  http://localhost:%GO_PORT%
echo   - BFF Express: http://localhost:%BFF_PORT%
echo   - Frontend:    http://localhost:%BFF_PORT%
echo ========================================
echo  Pressione Ctrl+C nas janelas dos servidores para parar.
echo ========================================
pause
