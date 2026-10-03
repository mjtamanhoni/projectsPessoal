@echo off
title Gestor - Rollback (PROD)
cd /d "%~dp0"

echo ========================================
echo  Rollback PROD - ultimo commit aprovado
echo ========================================
echo.
echo Commits disponiveis:
git log --oneline -8
echo.
set /p REF="Digite a tag/commit de destino (ex.: baseline-superadmin-2026-10-02): "
if "%REF%"=="" (
    echo [ERRO] Nenhum ref informado
    pause
    exit /b 1
)
echo.
echo Ref selecionado: %REF%
set /p CONFIRM="Confirma o rollback? (s/N): "
if /i not "%CONFIRM%"=="s" (
    echo Cancelado.
    pause
    exit /b 0
)
git reset --hard %REF%
if %errorlevel% neq 0 (
    echo [ERRO] Falha no git reset - nada foi alterado
    pause
    exit /b %errorlevel%
)
echo.
echo Rollback aplicado. Rebuildando...
call "%~dp0FrontEnd\publicar.bat"
