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

$md5 = [System.Security.Cryptography.MD5]::Create()
$hashBytes = $md5.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($PanelURL))
$instanceId = ([System.BitConverter]::ToString($hashBytes) -replace '-', '').Substring(0, 8).ToLower()

$installDir = "$env:ProgramData\BSDock\$instanceId"
$binName = "bsdock-agent-windows-${arch}.exe"
$binUrl = "$PanelURL/static/agent/$binName"
$binPath = "$installDir\bsdock-agent.exe"

$processes = Get-CimInstance Win32_Process -Filter "Name='bsdock-agent.exe'"
foreach ($proc in $processes) {
    if ($proc.CommandLine -and $proc.CommandLine.Contains($PanelURL)) {
        Write-Host "Stopping existing bsdock-agent process for $PanelURL ..."
        Stop-Process -Id $proc.ProcessId -Force -ErrorAction SilentlyContinue
    }
}
Start-Sleep -Seconds 2

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
