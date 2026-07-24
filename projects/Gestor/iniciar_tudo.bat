@echo off
title Gestor Financeiro - Iniciar Tudo
cd /d "%~dp0"

set GO_PORT=9000
set BFF_PORT=3001
set CLIENT_PORT=5173

echo ========================================
echo  Gestor Financeiro - Reinicio Completo
echo ========================================
echo.

REM --- Kill existing processes ---
echo [1/3] Verificando processos ativos...

for %%p in (%GO_PORT% %BFF_PORT% %CLIENT_PORT%) do (
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%%p "') do (
        if not "%%a"=="0" (
            echo   Porta %%p - PID %%a - Finalizando...
            taskkill /F /PID %%a >nul 2>&1
        )
    )
)

timeout /t 2 /nobreak >nul

echo.
echo [2/3] Iniciando servidor Go (Backend)...
start "Gestor - Backend (Go)" cmd /k "cd /d "%~dp0BackEnd\Server\Go\src" && go run main.go"

REM Aguarda o Go iniciar
echo   Aguardando backend na porta %GO_PORT%...
:wait_go
timeout /t 2 /nobreak >nul
netstat -ano | findstr ":%GO_PORT% " >nul 2>&1
if errorlevel 1 goto wait_go
echo   Backend Go OK (porta %GO_PORT%).

echo.
echo [3/3] Iniciando servidores Frontend...
start "Gestor - BFF (Server)" cmd /k "cd /d "%~dp0FrontEnd\src\server" && npm run dev"
start "Gestor - Client (React)" cmd /k "cd /d "%~dp0FrontEnd\src\client" && npm run dev"

echo.
echo ========================================
echo  Todos os servidores iniciados!
echo.
echo  Backend Go:  http://localhost:%GO_PORT%
echo  BFF (API):   http://localhost:%BFF_PORT%
echo  Frontend:    http://localhost:%CLIENT_PORT%
echo ========================================
echo.
echo  Pressione qualquer tecla para fechar esta janela...
echo  (Os servidores continuarao rodando em segundo plano)
pause >nul
