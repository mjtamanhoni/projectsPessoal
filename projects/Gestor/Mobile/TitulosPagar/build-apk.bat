@echo off
setlocal enabledelayedexpansion
title Gerar APK - Titulos a Pagar

set ROOT=%~dp0
set ANDROID_DIR=%ROOT%android

if not exist "%ANDROID_DIR%\local.properties" (
    if defined ANDROID_HOME (
        echo sdk.dir=%ANDROID_HOME:\=\\%>"%ANDROID_DIR%\local.properties"
    ) else if defined ANDROID_SDK_ROOT (
        echo sdk.dir=%ANDROID_SDK_ROOT:\=\\%>"%ANDROID_DIR%\local.properties"
    )
)

echo.
echo  =============================================
echo     GERAR APK - TITULOS A PAGAR
echo  =============================================
echo.

echo  [1/4] Compilando app mobile...
echo.
cd /d "%ROOT%"
call npm run build
if %errorlevel% neq 0 (
    echo.
    echo  [error] Falha no build do app
    pause
    exit /b 1
)
echo  [ok] App compilado com sucesso
echo.

echo  [2/4] Sincronizando com Capacitor...
echo.
cd /d "%ROOT%"
if exist "node_modules\.bin\cap.cmd" (
    call node_modules\.bin\cap.cmd sync
) else (
    call npx cap sync
)
if %errorlevel% neq 0 (
    echo.
    echo  [error] Falha no cap sync
    pause
    exit /b 1
)
echo  [ok] Capacitor sincronizado
echo.

echo  [3/4] Gerando APK...
echo.
cd /d "%ANDROID_DIR%"

set KEYSTORE=%ANDROID_DIR%\app\release.keystore
set KEY_ALIAS=titulos
if not defined KEYSTORE_PASS set KEYSTORE_PASS=gestor123

if exist "%KEYSTORE%" (
    echo  [info] Keystore encontrado - Gerando APK RELEASE
) else (
    echo  [info] Keystore nao encontrado - Gerando keystore automaticamente...
    echo.

    set KEYTOOL=keytool
    where keytool >nul 2>&1
    if errorlevel 1 (
        if defined JAVA_HOME (
            set KEYTOOL="%JAVA_HOME%\bin\keytool"
        ) else (
            for /f "tokens=*" %%i in ('dir /s /b "%LOCALAPPDATA%\Programs\Android Studio\jbr\bin\keytool.exe" 2^>nul') do set KEYTOOL="%%i"
            if "!KEYTOOL!"=="keytool" (
                for /f "tokens=*" %%i in ('dir /s /b "%ProgramFiles%\Android\Android Studio\jbr\bin\keytool.exe" 2^>nul') do set KEYTOOL="%%i"
            )
        )
    )
    echo  [info] Usando keytool: !KEYTOOL!

    !KEYTOOL! -genkey -v -keystore "%KEYSTORE%" -alias "%KEY_ALIAS%" -keyalg RSA -keysize 2048 -validity 10000 -storepass "%KEYSTORE_PASS%" -keypass "%KEYSTORE_PASS%" -dname "CN=Gestor, OU=Conesoft, O=Conesoft, L=Cidade, ST=Estado, C=BR" -noprompt
    if !errorlevel! neq 0 (
        echo.
        echo  [error] Falha ao gerar keystore
        pause
        exit /b 1
    )
    echo  [ok] Keystore criado em: %KEYSTORE%
)

echo.
call gradlew assembleRelease --rerun-tasks
set APK_PATH=%ANDROID_DIR%\app\build\outputs\apk\release\app-release.apk

if %errorlevel% neq 0 (
    echo.
    echo  [error] Falha ao gerar APK
    pause
    exit /b 1
)
echo  [ok] APK gerado com sucesso
echo.

echo  [4/4] Copiando APK...
echo.
set DEST=%ROOT%app-titulos-pagar.apk
if exist "%APK_PATH%" (
    copy /Y "%APK_PATH%" "%DEST%" >nul
    echo  [ok] APK copiado para: %DEST%
) else (
    echo  [warn] APK nao encontrado em: %APK_PATH%
    echo  [warn] Verifique se o build foi concluido
)
echo.
echo  =============================================
echo     PRONTO - APK gerado!
echo  =============================================
echo.
echo  Arquivo: %DEST%
echo.
pause
