# start-dev.ps1 — start Mongo (docker), server, and open Chrome
# Run in PowerShell as Administrator if Docker is not available or to allow container creation.

$cwd = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $cwd

Write-Host "Starting development environment..."

# Start Mongo using Docker if available
$docker = Get-Command docker -ErrorAction SilentlyContinue
if ($docker) {
  $cont = docker ps -a --filter "name=footsocial_mongo" --format "{{.Names}}:{{.Status}}" 2>$null
  if (-not $cont) {
    Write-Host "Creating Mongo container (footsocial_mongo)..."
    docker run -p 27017:27017 -d --name footsocial_mongo mongo:6
  } else {
    Write-Host "Mongo container exists. Ensuring it's running..."
    $running = docker ps --filter "name=footsocial_mongo" --format "{{.Names}}" 2>$null
    if (-not $running) { docker start footsocial_mongo }
  }
} else {
  Write-Host "Docker not found. Ensure MongoDB is running locally at mongodb://127.0.0.1:27017"
}

# Start the server in a new PowerShell window
Write-Host "Launching server (node server.js) in a new window..."
Start-Process powershell -ArgumentList "-NoExit -Command cd `"$cwd`"; node server.js" -WindowStyle Normal

# Open Chrome to the app
Write-Host "Opening Chrome to http://localhost:5000"
Start-Process chrome "http://localhost:5000"

Write-Host "Dev environment launched."
