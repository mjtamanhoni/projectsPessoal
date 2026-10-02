@echo off
chcp 65001 >nul
echo.
echo  ╔══════════════════════════════════════════╗
echo  ║   TROCANDO PARA TEMA DARK (Laranja)     ║
echo  ╚══════════════════════════════════════════╝
echo.

set GESTOR_ROOT=%~dp0..\..
set CLIENT_DIR=%GESTOR_ROOT%\FrontEnd\src\client
set CONFIG_FILE=%CLIENT_DIR%\tailwind.theme.config.js

:: Atualiza theme.config.js para importar o tema dark
(
echo // ============================================
echo // TEMA ATIVO
echo // ============================================
echo // Este arquivo define qual tema esta ativo.
echo // Nao edite manualmente. Use os scripts:
echo //   - trocar-tema-dark.bat   ^(tema escuro laranja^)
echo //   - trocar-tema-light.bat  ^(tema claro original^)
echo // ============================================
echo.
echo // ^>^>^> TEMA ATIVO: DARK ^<^<^<
echo export { default } from './tailwind.theme-dark.js';
) > "%CONFIG_FILE%"

echo  [OK] Tema DARK ativado com sucesso!
echo.
echo  Reiniciando o frontend...
echo.

cd /d "%CLIENT_DIR%"
if exist "package.json" (
    echo  Reiniciando com npm...
    start "" cmd /c "cd /d "%CLIENT_DIR%" && npm run dev"
) else (
    echo  [AVISO] Execute manualmente:
    echo    cd FrontEnd\src\client ^&^& npm run dev
)

echo.
pause
