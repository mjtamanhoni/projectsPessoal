@echo off
title Gestor - Aplicar no PROD
cd /d "%~dp0"

echo ========================================
echo  Promove DEV -^> MAIN e aplica no PROD
echo ========================================
echo.

REM Exige arvore limpa para nao promover meio-trabalho
for /f %%a in ('git status --porcelain') do (
    echo [ERRO] Ha alteracoes nao commitadas no DEV:
    git status --short
    echo.
    echo  Commite primeiro ^(ou use git stash^) e rode de novo.
    pause
    exit /b 1
)

REM Fast-forward main para dev sem trocar o working tree do DEV
git fetch . dev:main
if %errorlevel% neq 0 (
    echo [ERRO] main nao avanca para dev ^(divergencia?^)
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

echo.
echo ========================================
echo  APKs dos mobiles (opcional)
echo ========================================
echo  [1] Somente Titulos a Pagar
echo  [2] Cliente + Producao + Titulos a Pagar
echo  [3] Nao gerar agora
choice /c 123 /n /m "Escolha uma opcao [1/2/3]: "
if errorlevel 3 goto fim_mobiles
if errorlevel 2 (
    call :gerar_apk Cliente
    call :gerar_apk Producao
    call :gerar_apk TitulosPagar
    goto fim_mobiles
)
call :gerar_apk TitulosPagar

:fim_mobiles
echo.
echo  Os APKs ficam na pasta de cada mobile no PROD.
echo  Copie para o celular e instale manualmente (ou use adb install -r).
pause
exit /b 0

:gerar_apk
set "MOBILE=%~1"
if not exist "%PRODDIR%\Mobile\%MOBILE%\build-apk.bat" (
    echo [AVISO] build-apk.bat nao encontrado para %MOBILE%.
    exit /b 0
)
echo.
echo ----------------------------------------
echo  Gerando APK: %MOBILE%
echo ----------------------------------------
REM O build-apk.bat termina com "pause"; o echo. abaixo responde automaticamente
echo. | call "%PRODDIR%\Mobile\%MOBILE%\build-apk.bat"
if errorlevel 1 (
    echo [AVISO] Falha ao gerar o APK de %MOBILE%. A promocao web/backend segue OK.
) else (
    echo [OK] APK de %MOBILE% gerado.
)
exit /b 0
