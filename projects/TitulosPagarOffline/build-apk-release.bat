@echo off
setlocal EnableExtensions
title Gerar APK RELEASE - Titulos a Pagar (Offline)

rem ============================================================
rem  Gera o APK de release assinado.
rem  Se a keystore ainda nao existir, chama criar-keystore.bat.
rem
rem  Uso: build-apk-release.bat            (pausa ao final)
rem       build-apk-release.bat /nopause   (sem pausar)
rem ============================================================

set "RAIZ=%~dp0"
cd /d "%RAIZ%"

echo.
echo ============================================
echo   Titulos a Pagar - build RELEASE (assinado)
echo ============================================
echo.

if not exist "android\release.keystore" (
  echo [AVISO] Keystore de release ainda nao existe.
  echo Vamos cria-la agora...
  echo.
  call "%RAIZ%criar-keystore.bat" /nopause
)
if not exist "android\release.keystore" goto sem_keystore
if not exist "android\keystore.properties" goto sem_keystore

where node >nul 2>nul
if errorlevel 1 (
  echo [ERRO] Node.js nao encontrado no PATH.
  goto erro
)

if not exist "node_modules" (
  echo [1/4] Instalando dependencias...
  call npm install --no-audit --no-fund
  if errorlevel 1 goto erro
) else (
  echo [1/4] Dependencias ja instaladas.
)

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
  goto erro
)

if not defined ANDROID_HOME (
  if exist "%LOCALAPPDATA%\Android\Sdk" set "ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk"
)
if not defined ANDROID_HOME (
  echo [ERRO] Android SDK nao encontrado. Defina ANDROID_HOME.
  goto erro
)

echo [2/4] Compilando o app web (TypeScript + Vite)...
call npm run build
if errorlevel 1 goto erro

echo.
echo [3/4] Sincronizando com o projeto Android...
call npx cap sync android
if errorlevel 1 goto erro

echo.
echo [4/4] Gerando o APK de release...
cd /d "%RAIZ%android"
call gradlew.bat assembleRelease --console=plain
if errorlevel 1 goto erro
cd /d "%RAIZ%"

set "ASSINADO=android\app\build\outputs\apk\release\app-release.apk"
set "NAO_ASSINADO=android\app\build\outputs\apk\release\app-release-unsigned.apk"

if not exist "%ASSINADO%" (
  if exist "%NAO_ASSINADO%" (
    echo.
    echo [ERRO] O APK foi gerado sem assinatura. Confira android\keystore.properties.
  ) else (
    echo.
    echo [ERRO] APK de release nao encontrado apos o build.
  )
  goto erro
)

copy /y "%ASSINADO%" "TitulosPagarOffline-release.apk" >nul
if errorlevel 1 goto erro

echo.
echo ============================================
echo   APK RELEASE gerado com sucesso!
echo.
echo   Arquivo: %RAIZ%TitulosPagarOffline-release.apk
echo ============================================
echo.
echo Versao atual no build.gradle:
findstr /c:"versionCode" /c:"versionName" "android\app\build.gradle"
echo.
echo Lembrete: para cada envio a Play Store, aumente o versionCode
echo em android\app\build.gradle antes de gerar o APK/AAB.
echo.
echo IMPORTANTE: se a versao de teste (debug) estiver instalada no
echo aparelho, desinstale antes de instalar esta versao release.
echo As assinaturas sao diferentes e o Android nao atualiza por cima.
echo.
echo Para publicar na loja o formato recomendado e o AAB (Bundle),
echo gerado com: gradlew bundleRelease
goto fim

:sem_keystore
echo [ERRO] Keystore de release nao configurada.
echo.
echo Rode primeiro: criar-keystore.bat
echo (ele cria android\release.keystore e android\keystore.properties)
goto fim_erro

:erro
echo.
echo ============================================
echo   FALHA ao gerar o APK de release.
echo ============================================

:fim_erro
if /i not "%~1"=="/nopause" pause
endlocal
exit /b 1

:fim
if /i not "%~1"=="/nopause" pause
endlocal
