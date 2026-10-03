@echo off
title Gestor - Aplicar no PROD
cd /d "%~dp0"

echo ========================================
echo  Promove DEV -> MAIN e aplica no PROD
echo ========================================
echo.

REM Exige arvore limpa para nao promover meio-trabalho
for /f %%a in ('git status --porcelain') do (
    echo [ERRO] Ha alteracoes nao commitadas no DEV:
    git status --short
    echo.
    echo  Commite primeiro (ou use git stash) e rode de novo.
    pause
    exit /b 1
)

REM Fast-forward main para dev sem trocar o working tree do DEV
git fetch . dev:main
if %errorlevel% neq 0 (
    echo [ERRO] main nao avanca para dev (divergencia?)
    echo        Resolva manualmente: git checkout main ^&^& git merge dev
    pause
    exit /b %errorlevel%
)
echo main atualizado para:
git log --oneline -1 main
echo.

set PRODDIR=%~dp0..\..\..\developer-prod\projects\Gestor
if not exist "%PRODDIR%\atualizar.bat" (
    echo [ERRO] PROD nao encontrado em %PRODDIR%
    pause
    exit /b 1
)
echo Aplicando no PROD (pull + rebuild + restart)...
call "%PRODDIR%\atualizar.bat"
