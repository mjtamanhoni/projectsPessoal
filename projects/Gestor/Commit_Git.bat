@echo off
setlocal EnableExtensions
title Gestor - Commit Git
cd /d "%~dp0"

set "DEVDIR=C:\Users\mjtam\developer"
set "PRODDIR=C:\Users\mjtam\developer-prod"

REM Detecta o ambiente pela propria pasta onde o script esta
set "AMBIENTE=DEV"
echo.%~dp0| findstr /i /c:"developer-prod" >nul
if not errorlevel 1 set "AMBIENTE=PROD"

echo ==========================================
echo   Commit Git - Gestor
echo ==========================================
echo.
echo   [1] DEV  = %DEVDIR%
echo   [2] PROD = %PRODDIR%   so em emergencia, veja roteiro 11.3
echo.
echo   Detectado nesta pasta: %AMBIENTE%
echo.
set "OPCAO="
set /p "OPCAO=Escolha o ambiente [1 / 2 / Enter = detectado]: "
if "%OPCAO%"=="1" set "AMBIENTE=DEV"
if "%OPCAO%"=="2" set "AMBIENTE=PROD"

if "%AMBIENTE%"=="PROD" (set "ROOT=%PRODDIR%") else (set "ROOT=%DEVDIR%")
cd /d "%ROOT%"
if errorlevel 1 (
    echo [ERRO] Pasta nao encontrada: %ROOT%
    goto :fim
)

echo.
echo   Ambiente: %AMBIENTE%
echo   Pasta   : %CD%
echo.

git rev-parse --show-toplevel >nul 2>&1
if errorlevel 1 (
    echo [ERRO] Esta pasta nao e um repositorio Git.
    goto :fim
)

set "BRANCH="
for /f "delims=" %%b in ('git rev-parse --abbrev-ref HEAD') do set "BRANCH=%%b"
echo   Branch: %BRANCH%
echo.
echo ---------- O que mudou ----------
git status --short
echo ---------------------------------
echo.

set "VAZIO=1"
for /f %%a in ('git status --porcelain') do set "VAZIO=0"
if "%VAZIO%"=="1" (
    echo [AVISO] Nada para commitar - arvore limpa.
    goto :fim
)

if not "%AMBIENTE%"=="PROD" goto :ok_prod
echo.
echo   ******************************************
echo   * ATENCAO: voce vai commitar no PROD     *
echo   * O ideal e commitar na DEV e aplicar    *
echo   * com aplicar-no-prod.bat. Se for mesmo  *
echo   * emergencial, siga o roteiro 11.3.      *
echo   ******************************************
echo.
set "CONF="
set /p "CONF=Confirma commit no PROD? [s/N]: "
if /i "%CONF%"=="s" goto :ok_prod
echo Cancelado - nada foi alterado.
goto :fim
:ok_prod

echo.
set "MSG="
if not "%*"=="" set "MSG=%*"
if defined MSG set "MSG=%MSG:"=%"
if defined MSG goto :msg_ok
set /p "MSG=Comentario do commit: "
:msg_ok
if not defined MSG (
    echo.
    echo [ERRO] Comentario vazio - nada foi commitado.
    goto :fim
)

echo.
echo ---------- Como adicionar ----------
echo   [A] todos os arquivos ^(padrao^)
echo   [E] escolher um a um
echo   [C] cancelar
set "ADD="
set /p "ADD=Opcao [A/E/C]: "
if /i "%ADD%"=="C" goto :cancelado
if /i "%ADD%"=="E" goto :escolher
git add -A
goto :staged

:escolher
set "ARQ="
set /p "ARQ=  Caminho do arquivo, relativo a %CD%  [Enter = terminar]: "
if not defined ARQ goto :staged
git add "%ARQ%"
if errorlevel 1 echo   [ERRO] nao foi possivel adicionar: %ARQ%
goto :escolher

:staged
echo.
echo ---------- Vai entrar no commit ----------
git status --short
echo ----------------------------------------
echo.
echo Comentario: "%MSG%"
set "OK="
set /p "OK=Confirma o commit? [S/n]: "
if /i "%OK%"=="n" goto :cancelado

git commit -m "%MSG%"
if errorlevel 1 (
    echo.
    echo [ERRO] O commit nao foi criado - veja a mensagem acima.
    goto :fim
)

echo.
echo ---------- Commit feito ----------
git log --oneline -3
echo.

if not "%AMBIENTE%"=="PROD" goto :so_dev
echo   [IMPORTANTE] Agora leve a mesma mudanca para a DEV:
echo     1. copie o arquivo alterado de %PRODDIR% para %DEVDIR%
echo     2. rode este mesmo script escolhendo a opcao 1 - DEV
echo     3. faca push das duas, senao a proxima promocao trava
echo   Detalhes: roteiro, secao 11.3
goto :fim

:so_dev
echo   Proximo passo: aplicar-no-prod.bat para promover ao PROD
echo.
set "PUSH="
set /p "PUSH=Enviar ao GitHub agora? [S/n]: "
if /i "%PUSH%"=="n" goto :fim
git push origin %BRANCH%
if errorlevel 1 (
    echo [ERRO] push falhou - rode depois: git push origin %BRANCH%
)
goto :fim

:cancelado
echo Cancelado - nada foi commitado.
goto :fim

:fim
echo.
pause
endlocal
exit /b 0
