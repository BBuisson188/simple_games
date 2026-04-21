$ErrorActionPreference = "Stop"

$appFolder = Split-Path -Parent $MyInvocation.MyCommand.Path
$port = 8000
$url = "http://localhost:$port"

Set-Location $appFolder

$listener = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue

if (-not $listener) {
  Start-Process -FilePath "python" -ArgumentList "-m", "http.server", "$port" -WorkingDirectory $appFolder -WindowStyle Minimized
  Start-Sleep -Seconds 1
}

Start-Process $url

Write-Host ""
Write-Host "Mini Games is open at $url"
Write-Host "You can close this window. The local server will keep running in its own minimized window."
Write-Host ""
