@echo off
title Gestor - Configurar Impressora Termica USB
cd /d "%~dp0"

echo.
echo ========================================
echo  Gestor - Configuracao da Impressora
echo ========================================
echo.
echo  Este script configura o Print Agent para
echo  impressao direta via USB (sem spooler).
echo.
echo  Funciona com QUALQUER impressora termica:
echo    Epson, Star, Bixolon, Citizen, Xprinter,
echo    Elgin, MUNBYN, SPRT, etc.
echo.

echo ========================================
echo  PASSO 1: Instalando dependencias npm...
echo ========================================
echo.
call npm install --production
if %errorlevel% neq 0 (
    echo.
    echo [ERRO] Falha ao instalar dependencias npm.
    echo Verifique se o Node.js esta instalado.
    pause
    exit /b 1
)
echo.
echo Dependencias instaladas com sucesso!
echo.

echo ========================================
echo  PASSO 2: Baixando Zadig...
echo ========================================
echo.
if not exist "C:\print-agent\zadig.exe" (
    echo Baixando Zadig 2.9...
    powershell -NoProfile -Command "Invoke-WebRequest -Uri 'https://github.com/pbatard/libwdi/releases/download/v1.5.1/zadig-2.9.exe' -OutFile 'C:\print-agent\zadig.exe'"
    if %errorlevel% neq 0 (
        echo.
        echo [ERRO] Falha ao baixar Zadig.
        echo Baixe manualmente: https://zadig.akeo.ie/
        pause
        exit /b 1
    )
) else (
    echo Zadig ja baixado.
)
echo.

echo ========================================
echo  PASSO 3: Instalar driver WinUSB
echo ========================================
echo.
echo  INSTRUCOES:
echo.
echo  1. O Zadig sera aberto abaixo
echo  2. Conecte sua impressora termica via USB
echo  3. Clique em Options ^> List All Devices
echo  4. Na lista suspena, selecione sua impressora:
echo     - Epson: "EPSON TM-xxxx" ou "USB Printing Support"
echo     - Star: "STAR" ou "USB Printing Support"
echo     - Bixolon: "BIXOLON" ou "USB Printing Support"
echo     - Citizen: "CITIZEN" ou "USB Printing Support"
echo     - Xprinter: "XP-" ou "USB Printing Support"
echo     - Elgin: "ELGIN" ou "USB Printing Support"
echo     - Outras: selecione "USB Printing Support"
echo     (CUIDADO: selecione o dispositivo correto!)
echo  5. Verifique se o driver mostrado e "WinUSB"
echo  6. Clique no botao "Replace Driver" (ou "Install Driver")
echo  7. Aguarde a instalacao concluir
echo  8. Feche o Zadig e volte esta janela
echo.
echo  IMPORTANTE: Se selecionar o dispositivo errado,
echo  voce pode precisar reinstallar o driver original.
echo.
pause

"C:\print-agent\zadig.exe"

echo.
echo ========================================
echo  Configuracao concluida!
echo ========================================
echo.
echo  Agora inicie o Print Agent:
echo    node C:\print-agent\agent.js
echo.
echo  Ou execute instalar-agent.bat para
echo  baixar e iniciar automaticamente.
echo.
pause
