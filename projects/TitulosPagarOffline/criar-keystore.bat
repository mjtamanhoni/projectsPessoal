@echo off
setlocal
title Criar keystore de release - Titulos a Pagar

rem ============================================================
rem  Cria a keystore de assinatura (uma unica vez) e o arquivo
rem  android\keystore.properties usado pelo build de release.
rem
rem  ATENCAO: guarde release.keystore e a senha em local seguro.
rem  Sem eles nao e possivel publicar atualizacoes na Play Store
rem  para o mesmo aplicativo.
rem ============================================================

set "RAIZ=%~dp0"
if "%RAIZ:~-1%"=="\" set "RAIZ=%RAIZ:~0,-1%"

powershell -NoProfile -ExecutionPolicy Bypass -File "%RAIZ%\scripts\criar-keystore.ps1" -Raiz "%RAIZ%"
set "CODIGO=%ERRORLEVEL%"

if /i not "%~1"=="/nopause" pause
exit /b %CODIGO%
