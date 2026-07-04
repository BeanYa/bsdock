param(
    [Parameter(Mandatory = $true)]
    [string]$PanelURL,

    [Parameter(Mandatory = $true)]
    [string]$Token,

    [string]$Mode = "auto",

    [switch]$Insecure
)

$ErrorActionPreference = "Stop"

if ($Insecure) {
    [System.Net.ServicePointManager]::ServerCertificateValidationCallback = { $true }
}

$arch = switch ($env:PROCESSOR_ARCHITECTURE) {
    "AMD64" { "amd64" }
    "ARM64" { "arm64" }
    default { throw "Unsupported architecture: $env:PROCESSOR_ARCHITECTURE" }
}

$installDir = "$env:ProgramData\BSDock"
$binName = "bsdock-agent-windows-${arch}.exe"
$binUrl = "$PanelURL/static/agent/$binName"
$binPath = "$installDir\bsdock-agent.exe"

if (-not (Test-Path $installDir)) {
    New-Item -ItemType Directory -Path $installDir -Force | Out-Null
}

Write-Host "Downloading agent from $binUrl ..."
Invoke-WebRequest -Uri $binUrl -OutFile $binPath -UseBasicParsing

$argsList = @("--panel", $PanelURL, "--token", $Token, "--mode", $Mode)
if ($Insecure) {
    $argsList += "--insecure"
}

Write-Host "Starting agent ..."
Start-Process -FilePath $binPath -ArgumentList $argsList -NoNewWindow

Write-Host "Agent installed and started."
