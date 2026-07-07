param(
    [Parameter(Mandatory = $true)]
    [string]$PanelURL,

    [Parameter(Mandatory = $true)]
    [string]$Token,

    [string]$InstanceID = "",

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

if ([string]::IsNullOrWhiteSpace($InstanceID)) {
    $sha256 = [System.Security.Cryptography.SHA256]::Create()
    $hashBytes = $sha256.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($PanelURL))
    $instanceId = ([System.BitConverter]::ToString($hashBytes) -replace '-', '').Substring(0, 16).ToLower()
} else {
    if ($InstanceID -notmatch '^[a-fA-F0-9]{8,64}$') {
        throw "Invalid InstanceID: $InstanceID"
    }
    $instanceId = $InstanceID.ToLower()
}

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

# Validate that the downloaded file is a Windows executable (PE "MZ" header).
# If the Panel URL points at the Vite dev server instead of the panel backend,
# the server may return an HTML 404/fallback page, which Start-Process cannot
# execute and would report as "文件或目录损坏且无法读取".
$minimumSize = 4096
$fileInfo = Get-Item $binPath
if ($fileInfo.Length -lt $minimumSize) {
    throw "Downloaded file is too small ($($fileInfo.Length) bytes). Verify that -PanelURL points to the panel backend (e.g. http://localhost:8080), not the frontend dev server."
}

$stream = [System.IO.File]::OpenRead($binPath)
$header = New-Object byte[] 2
try {
    if ($stream.Read($header, 0, 2) -ne 2 -or
        $header[0] -ne 0x4D -or $header[1] -ne 0x5A) {
        throw "Downloaded file does not appear to be a valid Windows executable (missing MZ header). Verify that -PanelURL points to the panel backend (e.g. http://localhost:8080), not the frontend dev server."
    }
} finally {
    $stream.Dispose()
}

$argsList = @("--panel", $PanelURL, "--token", $Token, "--mode", $Mode)
if ($Insecure) {
    $argsList += "--insecure"
}

Write-Host "Starting agent ..."
Start-Process -FilePath $binPath -ArgumentList $argsList -NoNewWindow

Write-Host "Agent installed and started."
