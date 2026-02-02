@echo off
chcp 65001 >nul
title SGVA - Iniciando Sistema
color 0A

echo.
echo ====================================
echo   SGVA - Sistema de Gestão
echo ====================================
echo.

cd /d "%~dp0.."

echo Verificando Node.js...
where node >nul 2>&1
if %errorlevel% neq 0 (
    color 0C
    echo ERRO: Node.js não está instalado ou não está no PATH!
    echo Por favor, instale o Node.js primeiro.
    pause
    exit /b 1
)

echo Node.js encontrado!
echo.

echo Verificando se o servidor já está ativo...
powershell -Command "$result = Test-NetConnection -ComputerName localhost -Port 3000 -WarningAction SilentlyContinue -InformationLevel Quiet; if ($result) { exit 0 } else { exit 1 }" >nul 2>&1

if %errorlevel% equ 0 (
    echo ✓ Servidor já está rodando na porta 3000
    echo.
) else (
    echo Iniciando servidor SGVA...
    echo.
    start "SGVA Server" cmd /k "npm start"
    
    echo Aguardando o servidor iniciar...
    timeout /t 5 /nobreak >nul
)

echo Abrindo o sistema no navegador...
start http://localhost:3000/index.html

echo.
echo ====================================
echo   Sistema iniciado com sucesso!
echo ====================================
echo.
echo Mantenha a janela "SGVA Server" aberta
echo para que o sistema continue funcionando.
echo.
echo Pode fechar esta janela agora.
echo.
pause
