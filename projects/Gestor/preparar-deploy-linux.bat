@echo off
setlocal EnableExtensions EnableDelayedExpansion
title Gestor - Preparar pacote de deploy (Linux/Ubuntu)
cd /d "%~dp0"

REM ============================================================
REM  Monta o pacote MINIMO para implantar o Gestor no Ubuntu.
REM
REM  Uso:
REM    preparar-deploy-linux.bat                saida em %USERPROFILE%\deploy-linux
REM    preparar-deploy-linux.bat D:\meu-caminho saida em D:\meu-caminho
REM
REM  Saida gerada:
REM    <saida>\Gestor\...           pasta com os arquivos
REM    <saida>\gestor-linux.zip     a mesma pasta compactada
REM
REM  IMPORTANTE: rode este script de dentro da pasta que contem o
REM  codigo que voce quer subir (developer-prod = producao).
REM ============================================================

set "FONTE=%~dp0"
if "%FONTE:~-1%"=="\" set "FONTE=%FONTE:~0,-1%"

set "SAIDA=%~1"
if "%SAIDA%"=="" set "SAIDA=%USERPROFILE%\deploy-linux"
set "STAGE=%SAIDA%\Gestor"
set "ZIP=%SAIDA%\gestor-linux.zip"
set "FALTANDO=0"
set "SUJO=0"

echo.
echo ==========================================
echo   Gestor - Pacote de deploy para Linux
echo ==========================================
echo.
echo   Fonte : %FONTE%
echo   Saida : %STAGE%
echo.

if not exist "%FONTE%\BackEnd\Server\Go\src\main.go" (
    echo [ERRO] Esta pasta nao parece ser a raiz do projeto Gestor.
    echo        Esperado encontrar: BackEnd\Server\Go\src\main.go
    echo        Rode o script de dentro de ...\projects\Gestor
    goto :fim
)

REM ---------- limpa a saida anterior ----------
if exist "%STAGE%" rmdir /s /q "%STAGE%"
if exist "%ZIP%"   del   /q "%ZIP%"
mkdir "%STAGE%" 2>nul
if not exist "%STAGE%" (
    echo [ERRO] Nao foi possivel criar a pasta de saida: %STAGE%
    goto :fim
)

echo [1/6] Backend Go - copiando fontes...
robocopy "%FONTE%\BackEnd\Server\Go\src" "%STAGE%\BackEnd\Server\Go\src" /E /NFL /NDL /NJH /NJS /XD node_modules data /XF *.exe *.log .env .gitignore *.lnk *.bat gestor-server
if errorlevel 8 goto :falha

echo [2/6] Scripts SQL - schema do banco...
mkdir "%STAGE%\BackEnd\Server\src" 2>nul
if exist "%FONTE%\BackEnd\Server\src\ddl_gestor_v2.sql" (
    copy /y "%FONTE%\BackEnd\Server\src\ddl_gestor_v2.sql" "%STAGE%\BackEnd\Server\src\" >nul
)
for %%f in ("%FONTE%\BackEnd\Server\src\formulario_*.sql") do (
    if exist "%%f" copy /y "%%f" "%STAGE%\BackEnd\Server\src\" >nul
)
if not exist "%STAGE%\BackEnd\Server\src\ddl_gestor_v2.sql" (
    echo [ERRO] ddl_gestor_v2.sql nao encontrado em %FONTE%\BackEnd\Server\src
    goto :falha
)

echo [3/6] BFF (FrontEnd\src\server) - copiando fontes...
robocopy "%FONTE%\FrontEnd\src\server" "%STAGE%\FrontEnd\src\server" /E /NFL /NDL /NJH /NJS /XD node_modules dist data /XF .env *.log *.bat .dockerignore
if errorlevel 8 goto :falha

echo [4/6] Frontend (FrontEnd\src\client) - copiando fontes...
robocopy "%FONTE%\FrontEnd\src\client" "%STAGE%\FrontEnd\src\client" /E /NFL /NDL /NJH /NJS /XD node_modules dist mobile /XF .env.local *.pdf *.cjs *.bat .dockerignore *.tsbuildinfo .env
if errorlevel 8 goto :falha

echo [5/6] Compactando em gestor-linux.zip...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Compress-Archive -Path '%STAGE%\*' -DestinationPath '%ZIP%' -Force"
if errorlevel 1 (
    echo [AVISO] Falha ao criar o zip. A pasta continua pronta: %STAGE%
)

echo.
echo [6/6] Conferindo o pacote...
echo.

call :checa "%STAGE%\BackEnd\Server\Go\src\main.go"
call :checa "%STAGE%\BackEnd\Server\Go\src\go.mod"
call :checa "%STAGE%\BackEnd\Server\Go\src\go.sum"
call :checa "%STAGE%\BackEnd\Server\Go\src\config\config.go"
call :checa "%STAGE%\BackEnd\Server\Go\src\database\migrations.go"
call :checa "%STAGE%\BackEnd\Server\src\ddl_gestor_v2.sql"
call :checa "%STAGE%\FrontEnd\src\server\package.json"
call :checa "%STAGE%\FrontEnd\src\server\package-lock.json"
call :checa "%STAGE%\FrontEnd\src\server\tsconfig.json"
call :checa "%STAGE%\FrontEnd\src\server\src\index.ts"
call :checa "%STAGE%\FrontEnd\src\server\src\config.ts"
call :checa "%STAGE%\FrontEnd\src\client\package.json"
call :checa "%STAGE%\FrontEnd\src\client\package-lock.json"
call :checa "%STAGE%\FrontEnd\src\client\index.html"
call :checa "%STAGE%\FrontEnd\src\client\vite.config.ts"
call :checa "%STAGE%\FrontEnd\src\client\src\main.tsx"

echo.
if "%FALTANDO%"=="1" (
    echo [ERRO] O pacote esta INCOMPLETO - veja os itens [FALTA] acima.
    goto :fim
)

echo Verificando que nada proibido entrou no pacote...
if exist "%STAGE%\FrontEnd\src\client\node_modules" (
    echo   [*] node_modules no client
    set "SUJO=1"
)
if exist "%STAGE%\FrontEnd\src\server\node_modules" (
    echo   [*] node_modules no server
    set "SUJO=1"
)
if exist "%STAGE%\BackEnd\Server\Go\src\node_modules" (
    echo   [*] node_modules no Go
    set "SUJO=1"
)
if exist "%STAGE%\FrontEnd\src\client\dist" (
    echo   [*] pasta dist no client
    set "SUJO=1"
)
if exist "%STAGE%\FrontEnd\src\server\dist" (
    echo   [*] pasta dist no server
    set "SUJO=1"
)
if exist "%STAGE%\BackEnd\Server\Go\src\.env" (
    echo   [*] .env do Go  - SEGURDO, apague antes de enviar
    set "SUJO=1"
)
if exist "%STAGE%\FrontEnd\src\server\.env" (
    echo   [*] .env do BFF - SEGURDO, apague antes de enviar
    set "SUJO=1"
)
if exist "%STAGE%\BackEnd\Server\Go\src\data" (
    echo   [*] pasta data de logs no Go
    set "SUJO=1"
)
if "%SUJO%"=="1" (
    echo.
    echo [ATENCAO] O pacote contem arquivos que nao devem ir para o servidor.
)

echo.
echo ==========================================
echo   Pacote pronto
echo ==========================================
echo.
echo   Pasta : %STAGE%
set "ZIPMB=nao gerado"
if exist "%ZIP%" for %%z in ("%ZIP%") do set /a "ZIPMB=%%~zz / 1024"
echo   Zip   : %ZIP%
echo   Tamanho: %ZIPMB% KB
echo.

echo ==========================================
echo   Proximos passos
echo ==========================================
echo.
echo   1) Envie o pacote do servidor Windows para o Linux:
echo.
echo        scp "%ZIP%" SEU_USUARIO@IP_DO_SERVIDOR:/tmp/
echo.
echo   2) No servidor Linux, siga o roteiro completo:
echo.
echo        docs\ROTEIRO-UBUNTU.md
echo        docs\roteiro-implantacao-ubuntu.pdf
echo.
echo      Resumo: descompactar em /opt/gestor, criar os .env,
echo      aplicar o ddl_gestor_v2.sql, compilar Go e Node,
echo      criar os services systemd e configurar o nginx.
echo.
goto :fim

REM ================= rotinas =================

:checa
if exist "%~1" (
    echo   [ok] %~nx1
) else (
    echo   [FALTA] %~1
    set /a FALTANDO+=1
)
goto :eof

:falha
echo.
echo [ERRO] Falha ao copiar arquivos (robocopy retornou codigo 8 ou mais).
echo        Confira permissoes da pasta de saida e tente de novo.
goto :fim

:fim
echo.
pause
endlocal
exit /b 0
