@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

title Gerar APK - Gestor Financeiro

set MODE=%1
if "%MODE%"=="" set MODE=horas

if /i not "%MODE%"=="gestor" if /i not "%MODE%"=="horas" if /i not "%MODE%"=="producao" (
    echo.
    echo   ^<error^> Modo invalido: "%MODE%"
    echo   Use: gestor, horas, ou producao
    echo.
    echo   Ex: build-apk.bat horas
    echo.
    pause
    exit /b 1
)

set ROOT=%~dp0
set MOBILE_DIR=%ROOT%mobile\%MODE%
set ANDROID_DIR=%MOBILE_DIR%\android

echo.
echo   ^<=============================================^>
echo      GERAR APK - %MODE%
echo   ^<=============================================^>
echo.
echo   [1/4] Compilando web (build:%MODE%)...
echo.
cd /d "%ROOT%"
call npm run build:%MODE%
if %errorlevel% neq 0 (
    echo.
    echo   ^<error^> Falha no build web
    pause
    exit /b 1
)
echo   ^<ok^> Web compilado com sucesso
echo.

echo   [2/4] Sincronizando com Capacitor...
echo.
cd /d "%MOBILE_DIR%"
call npx cap sync
if %errorlevel% neq 0 (
    echo.
    echo   ^<error^> Falha no cap sync
    pause
    exit /b 1
)
echo   ^<ok^> Capacitor sincronizado
echo.

echo   [3/4] Gerando APK...
echo.
cd /d "%ANDROID_DIR%"

set KEYSTORE=%ANDROID_DIR%\app\release.keystore
set KEY_ALIAS=%MODE%

if exist "%KEYSTORE%" (
    echo   ^<info^> Keystore encontrado — Gerando APK RELEASE
) else (
    echo   ^<info^> Keystore nao encontrado — Gerando keystore automaticamente...
    echo.

    REM Tenta localizar keytool no PATH, JAVA_HOME, ou Android Studio
    set KEYTOOL=keytool
    where keytool >nul 2>&1
    if errorlevel 1 (
        if defined JAVA_HOME (
            set KEYTOOL="%JAVA_HOME%\bin\keytool"
        ) else (
            for /f "tokens=*" %%i in ('dir /s /b "%ANDROID_DIR%\..\..\..\..\..\..\..\Program Files\Android\Android Studio\jbr\bin\keytool.exe" 2^>nul') do set KEYTOOL="%%i"
            if "!KEYTOOL!"=="" (
                for /f "tokens=*" %%i in ('dir /s /b "%LOCALAPPDATA%\Android\Sdk\..\..\..\Android Studio\jbr\bin\keytool.exe" 2^>nul') do set KEYTOOL="%%i"
            )
        )
    )
    echo   ^<info^> Usando keytool: !KEYTOOL!

    !KEYTOOL! -genkey -v ^
        -keystore "%KEYSTORE%" ^
        -alias "%KEY_ALIAS%" ^
        -keyalg RSA -keysize 2048 ^
        -validity 10000 ^
        -storepass "gestor123" ^
        -keypass "gestor123" ^
        -dname "CN=Gestor Financeiro, OU=Conesoft, O=Conesoft, L=Cidade, ST=Estado, C=BR" ^
        -noprompt
    if !errorlevel! neq 0 (
        echo.
        echo   ^<error^> Falha ao gerar keystore. Tente gerar manualmente:
        echo      keytool -genkey -v -keystore release.keystore -alias %MODE% -keyalg RSA -keysize 2048 -validity 10000
        echo.
        pause
        exit /b 1
    )
    echo   ^<ok^> Keystore criado em: %KEYSTORE%

    REM Cria signing.gradle se ainda nao existir
    set SIGNING_GRADLE=%ANDROID_DIR%\app\signing.gradle
    if not exist "%SIGNING_GRADLE%" (
        echo.
        echo   ^<info^> Criando signing.gradle...
        (
            echo android {
            echo     signingConfigs {
            echo         release {
            echo             storeFile file("release.keystore")
            echo             storePassword "gestor123"
            echo             keyAlias "%KEY_ALIAS%"
            echo             keyPassword "gestor123"
            echo         }
            echo     }
            echo }
        ) > "%SIGNING_GRADLE%"
        echo   ^<ok^> signing.gradle criado
    )
)

echo.
call ./gradlew assembleRelease
set APK_PATH=%ANDROID_DIR%\app\build\outputs\apk\release\app-release.apk

if %errorlevel% neq 0 (
    echo.
    echo   ^<error^> Falha ao gerar APK
    pause
    exit /b 1
)
echo   ^<ok^> APK gerado com sucesso
echo.

echo   [4/4] Copiando APK...
echo.
set DEST=%ROOT%dist\%MODE%\app-%MODE%.apk
if exist "%APK_PATH%" (
    copy /Y "%APK_PATH%" "%DEST%" >nul
    echo   ^<ok^> APK copiado para: %DEST%
) else (
    echo   ^<warn^> APK nao encontrado em: %APK_PATH%
    echo   ^<warn^> Verifique se o build foi concluido
)
echo.

echo   ^<=============================================^>
echo      PRONTO - APK gerado!
echo   ^<=============================================^>
echo.
echo   Arquivo: %DEST%
echo.
echo   ^<info^> APK Release assinado gerado com sucesso!
echo   ^<info^> O keystore e signing.gradle foram criados automaticamente reutilizaveis.
echo.

pause
