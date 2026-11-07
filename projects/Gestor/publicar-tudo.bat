@echo off
setlocal EnableExtensions
title Gestor - Publicar Tudo (DEV para GIT e PROD)

set "DEVDIR=C:\Users\mjtam\developer"
set "PRODREPO=C:\Users\mjtam\developer-prod"
set "PRODDIR=%PRODREPO%\projects\Gestor"
set "GESTOR=%DEVDIR%\projects\Gestor"
set "TSBUILD=projects/Gestor/FrontEnd/src/client/tsconfig.tsbuildinfo"

cd /d "%GESTOR%"
if errorlevel 1 goto :erro_pasta

echo ==========================================
echo  Publicar Tudo - DEV -^> GIT -^> PROD
echo ==========================================
echo.

echo [1/4] Verificando branch e estado do DEV...
set "BRANCH="
for /f "delims=" %%b in ('git -C "%DEVDIR%" rev-parse --abbrev-ref HEAD') do set "BRANCH=%%b"
if /i not "%BRANCH%"=="dev" (
    echo [ERRO] O repositorio DEV nao esta na branch dev ^(esta em %BRANCH%^).
    goto :erro_pausa
)
git -C "%DEVDIR%" status --short
echo.

set "DIRTY=1"
for /f %%a in ('git -C "%DEVDIR%" status --porcelain') do set "DIRTY=0"

if "%DIRTY%"=="1" goto :sem_commit

echo [2/4] Commitando alteracoes do DEV...
set "MSG="
set /p "MSG=Comentario do commit: "
if not defined MSG (
    echo [ERRO] Comentario vazio - nada foi commitado.
    goto :erro_pausa
)
git -C "%DEVDIR%" add -A
git -C "%DEVDIR%" commit -m "%MSG%"
if errorlevel 1 (
    echo [ERRO] Falha ao criar o commit.
    goto :erro_pausa
)
goto :push_dev

:sem_commit
echo [2/4] Nada para commitar no DEV.

:push_dev
echo.
echo [3/4] Enviando dev e main para o GIT...
git -C "%DEVDIR%" push origin dev
if errorlevel 1 (
    echo [ERRO] Falha no push de dev. O PROD nao foi alterado.
    goto :erro_pausa
)
git -C "%DEVDIR%" fetch . dev:main
if errorlevel 1 (
    echo [ERRO] main nao avanca para dev ^(divergencia?^).
    echo        Resolva: git checkout main ^&^& git merge dev
    goto :erro_pausa
)
git -C "%DEVDIR%" push origin main
if errorlevel 1 (
    echo [ERRO] Falha no push de main. O PROD nao foi alterado.
    goto :erro_pausa
)
echo dev e main enviados (origin).

echo.
echo [4/4] Aplicando no PROD (pull + build + restart)...
if not exist "%PRODDIR%\atualizar.bat" (
    echo [ERRO] PROD nao encontrado em %PRODDIR%.
    goto :erro_pausa
)
git -C "%PRODREPO%" checkout -- "%TSBUILD%" >nul 2>&1
git -C "%PRODREPO%" status --short
call "%PRODDIR%\atualizar.bat"
if errorlevel 1 (
    echo [ERRO] Falha ao atualizar o PROD.
    goto :erro_pausa
)

echo.
echo [OK] Fluxo concluido: DEV e main no GIT, PROD compilado e reiniciado.
goto :fim

:erro_pausa
echo.
echo Fluxo interrompido.
pause
exit /b 1

:erro_pasta
echo [ERRO] Pasta nao encontrada: %GESTOR%
pause
exit /b 1

:fim
echo.
pause
endlocal
exit /b 0
