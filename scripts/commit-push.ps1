param(
    [string]$Message = ""
)

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $repoRoot

$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm"
if ([string]::IsNullOrWhiteSpace($Message)) {
    $Message = "chore: atualizacoes ($timestamp)"
}

$changed = git status --porcelain
if ([string]::IsNullOrWhiteSpace($changed)) {
    Write-Host "Nenhuma mudanca para commit." -ForegroundColor Yellow
    exit 0
}

git add -A

git commit -m "$Message"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Falha ao criar commit." -ForegroundColor Red
    exit $LASTEXITCODE
}

git push
if ($LASTEXITCODE -ne 0) {
    Write-Host "Falha ao fazer push." -ForegroundColor Red
    exit $LASTEXITCODE
}

Write-Host "Commit e push concluido." -ForegroundColor Green
