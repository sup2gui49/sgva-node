[CmdletBinding()]
param(
    [string]$StartUrl = "http://localhost:3000/folha-dashboard.html",
    [switch]$UseEdgeAppWindow = $true,
    [int]$Port = 3000
)

function Test-CommandExists {
    param([string]$Command)
    return [bool](Get-Command $Command -ErrorAction SilentlyContinue)
}

function Test-PortReady {
    param([int]$Port)
    $connection = Test-NetConnection -ComputerName 'localhost' -Port $Port -WarningAction SilentlyContinue -ErrorAction SilentlyContinue
    return $connection.TcpTestSucceeded
}

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptRoot

Write-Host "📁 Projeto:" $projectRoot

if (-not (Test-CommandExists 'node')) {
    Write-Error 'Node.js não está instalado ou não está no PATH. Instale o Node.js para continuar.'
    exit 1
}

if (-not (Test-CommandExists 'npm')) {
    Write-Error 'npm não está disponível no PATH. Verifique a instalação do Node.js.'
    exit 1
}

$serverAlreadyRunning = Test-PortReady -Port $Port

if ($serverAlreadyRunning) {
    Write-Host "✅ Servidor já está ativo na porta $Port."
} else {
    Write-Host "🚀 Iniciando servidor SGVA..."
    $startCommand = "Set-Location `"$projectRoot`"; npm start"
    try {
        Start-Process -FilePath "pwsh" -ArgumentList '-NoExit','-Command', $startCommand -WindowStyle Normal
        Write-Host "Aguardando o servidor ficar disponível..."
        $attempts = 0
        while ($attempts -lt 20 -and -not (Test-PortReady -Port $Port)) {
            Start-Sleep -Seconds 1
            $attempts++
        }
        if ($attempts -ge 20) {
            Write-Warning "O servidor pode ainda não estar pronto. Verifique a janela do PowerShell que foi aberta."
        } else {
            Write-Host "Servidor disponível em http://localhost:$Port"
        }
    } catch {
        Write-Error "Não foi possível iniciar o servidor: $_"
        exit 1
    }
}

function Open-InEdgeApp {
    param([string]$Url)
    $edgePath = (Get-Command msedge -ErrorAction SilentlyContinue)?.Source
    if (-not $edgePath) {
        return $false
    }
    Start-Process -FilePath $edgePath -ArgumentList "--new-window","--app=$Url"
    return $true
}

Write-Host "🌐 Abrindo o SGVA no navegador..."
if ($UseEdgeAppWindow -and (Open-InEdgeApp -Url $StartUrl)) {
    Write-Host "Abrindo no modo aplicativo do Microsoft Edge."
} else {
    Start-Process $StartUrl
}

Write-Host "Tudo pronto! Pode utilizar o SGVA no navegador aberto."
