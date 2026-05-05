#!/usr/bin/env pwsh
param(
  [string]$Version = "latest",
  [string]$BinDir = ""
)

$Repo = "anomalyco/OrchOS"
$BinName = "orchos-cli.exe"

if (-not $BinDir) {
  $BinDir = if ($IsWindows) { "$env:USERPROFILE\.orchos\bin" } else { "/usr/local/bin" }
}

function Write-Info  { Write-Host $args -ForegroundColor Cyan }
function Write-Ok    { Write-Host $args -ForegroundColor Green }
function Write-Warn  { Write-Host $args -ForegroundColor Yellow }
function Write-Error { Write-Host $args -ForegroundColor Red; exit 1 }

function Detect-Platform {
  $os = "windows"
  $arch = switch ([System.Runtime.InteropServices.RuntimeInformation]::ProcessArchitecture) {
    "X64"   { "x64" }
    "Arm64" { "arm64" }
    default { throw "Unsupported architecture: $_" }
  }
  return "${os}-${arch}"
}

function Install-PrebuiltBinary {
  param([string]$Platform)

  if ($Version -eq "latest") {
    $url = "https://github.com/$Repo/releases/latest/download/orchos-cli-${Platform}.exe"
  } else {
    $url = "https://github.com/$Repo/releases/download/$Version/orchos-cli-${Platform}.exe"
  }

  Write-Info "Downloading orchos-cli for $Platform..."
  $tmp = Join-Path $env:TEMP "orchos-cli-$([System.IO.Path]::GetRandomFileName())"
  $tmpDir = New-Item -ItemType Directory -Path $tmp -Force

  try {
    if (Get-Command curl -ErrorAction SilentlyContinue) {
      curl.exe -fsSL $url -o (Join-Path $tmpDir $BinName)
    } else {
      [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
      Invoke-WebRequest -Uri $url -OutFile (Join-Path $tmpDir $BinName)
    }
  } catch {
    return $false
  }

  if (-not (Test-Path (Join-Path $tmpDir $BinName))) {
    return $false
  }

  if (-not (Test-Path $BinDir)) {
    New-Item -ItemType Directory -Path $BinDir -Force | Out-Null
  }

  Copy-Item (Join-Path $tmpDir $BinName) (Join-Path $BinDir $BinName)
  Remove-Item -Recurse -Force $tmpDir

  Write-Ok "Installed orchos-cli to $(Join-Path $BinDir $BinName)"
  return $true
}

function Install-WithBun {
  Write-Info "Building orchos-cli from source (requires Bun)..."

  if (-not (Get-Command bun -ErrorAction SilentlyContinue)) {
    Write-Info "Bun not found. Installing Bun..."
    powershell -c "irm bun.sh/install.ps1 | iex"
    $env:Path = "$env:USERPROFILE\.bun\bin;$env:Path"
  }

  $tmp = Join-Path $env:TEMP "orchos-cli-$([System.IO.Path]::GetRandomFileName())"
  Write-Info "Cloning $Repo..."
  git clone --depth 1 "https://github.com/$Repo.git" $tmp 2>$null
  if (-not $?) {
    Write-Error "Failed to clone repository. Make sure git is installed."
  }

  Push-Location (Join-Path $tmp "apps\cli")
  try {
    bun install
    bun run build:binary
    $binary = Get-ChildItem -Path . -Filter "orchos-cli*" -File | Select-Object -First 1

    if (-not $binary) {
      Write-Error "Build failed: no binary found."
    }

    if (-not (Test-Path $BinDir)) {
      New-Item -ItemType Directory -Path $BinDir -Force | Out-Null
    }

    Copy-Item $binary.FullName (Join-Path $BinDir $BinName)
    Write-Ok "Built and installed orchos-cli to $(Join-Path $BinDir $BinName)"
  } finally {
    Pop-Location
    Remove-Item -Recurse -Force $tmp -ErrorAction SilentlyContinue
  }
}

function Add-ToPath {
  $userPath = [Environment]::GetEnvironmentVariable("Path", "User")
  if ($userPath -notlike "*$BinDir*") {
    [Environment]::SetEnvironmentVariable("Path", "$userPath;$BinDir", "User")
    $env:Path = "$env:Path;$BinDir"
    Write-Info "Added $BinDir to your PATH (log out and back in or restart your terminal)"
  }
}

function Main {
  $platform = Detect-Platform
  Write-Info "Detected platform: $platform"

  if (-not (Install-PrebuiltBinary $platform)) {
    Write-Warn "Pre-built binary not available. Falling back to source build..."
    Install-WithBun
  }

  Add-ToPath

  Write-Ok ""
  Write-Ok "OrchOS CLI installed!"
  Write-Info ""
  Write-Info "Quick start:"
  Write-Info "  orchos-cli --help"
  Write-Info ""
  Write-Info "Pair with your dashboard:"
  Write-Info "  orchos-cli --api-url https://app.orchos.dev --pairing-token <token>"
}

Main
