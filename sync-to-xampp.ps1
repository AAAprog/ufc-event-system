param(
    [string]$Source = $PSScriptRoot,
    [string]$Target = 'C:\xampp\htdocs\ufc_event_system'
)

$resolvedSource = (Resolve-Path -LiteralPath $Source).Path

if (-not (Test-Path -LiteralPath $Target)) {
    New-Item -ItemType Directory -Path $Target -Force | Out-Null
}

Write-Host "Syncing project to XAMPP..." -ForegroundColor Yellow
Write-Host "Source: $resolvedSource"
Write-Host "Target: $Target"

robocopy $resolvedSource $Target /MIR /XD .git node_modules
$exitCode = $LASTEXITCODE

if ($exitCode -ge 8) {
    throw "Robocopy failed with exit code $exitCode."
}

Write-Host "Sync complete." -ForegroundColor Green
