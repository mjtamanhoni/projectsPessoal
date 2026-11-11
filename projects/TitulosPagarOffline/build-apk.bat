@echo off
setlocal EnableExtensions
title Gerar APK - Titulos a Pagar (Offline)

rem ============================================================
rem  Gera o APK do app Titulos a Pagar (offline).
rem  Uso: build-apk.bat            (gera Debug, instalavel)
rem       build-apk.bat /nopause   (sem pausar ao final)
rem ============================================================

set "RAIZ=%~dp0"
cd /d "%RAIZ%"

echo.
echo ============================================
echo   Titulos a Pagar - build do APK
echo ============================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [ERRO] Node.js nao encontrado no PATH.
  goto erro
)
where npm >nul 2>nul
if errorlevel 1 (
  echo [ERRO] npm nao encontrado no PATH.
  goto erro
)

if not exist "node_modules" (
  echo [1/4] Instalando dependencias...
  call npm install --no-audit --no-fund
  if errorlevel 1 goto erro
) else (
  echo [1/4] Dependencias ja instaladas.
)

rem --- Java 17 (exigido pelo Gradle/AGP) ---
if not defined JAVA_HOME (
  if exist "%USERPROFILE%\.jdks\jbr-17.0.14\bin\java.exe" (
    set "JAVA_HOME=%USERPROFILE%\.jdks\jbr-17.0.14"
  ) else if exist "%LOCALAPPDATA%\Programs\Android Studio\jbr\bin\java.exe" (
    set "JAVA_HOME=%LOCALAPPDATA%\Programs\Android Studio\jbr"
  ) else if exist "%ProgramFiles%\Android\Android Studio\jbr\bin\java.exe" (
    set "JAVA_HOME=%ProgramFiles%\Android\Android Studio\jbr"
  )
)
if not defined JAVA_HOME (
  echo [ERRO] JAVA_HOME nao definido e nenhum JDK 17 encontrado.
  echo        Instale o Android Studio ou ajuste JAVA_HOME manualmente.
  goto erro
)
echo       JAVA_HOME = %JAVA_HOME%

rem --- Android SDK ---
if not defined ANDROID_HOME (
  if exist "%LOCALAPPDATA%\Android\Sdk" set "ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk"
)
if not defined ANDROID_HOME (
  echo [ERRO] Android SDK nao encontrado. Defina ANDROID_HOME.
  goto erro
)
echo       ANDROID_HOME = %ANDROID_HOME%

echo.
echo [2/4] Compilando o app web (TypeScript + Vite)...
call npm run build
if errorlevel 1 goto erro

echo.
echo [3/4] Sincronizando com o projeto Android...
call npx cap sync android
if errorlevel 1 goto erro

echo.
echo [4/4] Gerando o APK (Gradle)...
cd /d "%RAIZ%android"
call gradlew.bat assembleDebug --console=plain
if errorlevel 1 goto erro
cd /d "%RAIZ%"

if not exist "android\app\build\outputs\apk\debug\app-debug.apk" (
  echo [ERRO] APK nao encontrado apos o build.
  goto erro
)

copy /y "android\app\build\outputs\apk\debug\app-debug.apk" "TitulosPagarOffline.apk" >nul
if errorlevel 1 goto erro

echo.
echo ============================================
echo   APK gerado com sucesso!
echo.
echo   Arquivo: %RAIZ%TitulosPagarOffline.apk
echo ============================================
echo.
echo Para instalar no celular: copie o APK, abra no aparelho
echo e permita "instalar de fontes desconhecidas".
echo.
echo Observacao: este e um APK de DEBUG (testes). Para publicar
echo na Play Store sera preciso configurar uma keystore de release.
goto fim

:erro
echo.
echo ============================================
echo   FALHA ao gerar o APK. Veja as mensagens acima.
echo ============================================

:fim
if /i not "%~1"=="/nopause" pause
endlocal
