# ============================================================
# EV Battery Monitoring System — Frontend Startup Script
# Run this from the MINI PRO root folder:
#   powershell -ExecutionPolicy Bypass -File start_frontend.ps1
# ============================================================

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host "  EV Battery Safety Monitoring — React Dashboard"     -ForegroundColor Cyan
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host ""

# Try to find Node.js (WinGet-installed location first, then system PATH)
$wingetNodePath = "C:\Users\$env:USERNAME\AppData\Local\Microsoft\WinGet\Packages"
$nodeExe = $null
$npmCmd  = $null

if (Test-Path $wingetNodePath) {
    $nodeDirs = Get-ChildItem $wingetNodePath -Filter "OpenJS.NodeJS*" -Directory -ErrorAction SilentlyContinue
    foreach ($dir in $nodeDirs) {
        $candidate = Get-ChildItem $dir.FullName -Filter "node-v*-win-x64" -Directory -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($candidate) {
            $nodeExe = Join-Path $candidate.FullName "node.exe"
            $npmCmd  = Join-Path $candidate.FullName "npm.cmd"
            $env:Path = "$($candidate.FullName);" + $env:Path
            break
        }
    }
}

# Fallback: try system PATH
if (-not $nodeExe -or -not (Test-Path $nodeExe)) {
    $nodeExe = (Get-Command node -ErrorAction SilentlyContinue)?.Source
    $npmCmd  = (Get-Command npm  -ErrorAction SilentlyContinue)?.Source
}

if (-not $nodeExe) {
    Write-Host "ERROR: Node.js not found! Please install from https://nodejs.org" -ForegroundColor Red
    exit 1
}

$nodeVersion = & $nodeExe -v
Write-Host "Node.js found: $nodeVersion" -ForegroundColor Green

# Navigate to frontend
Set-Location "$PSScriptRoot\frontend"

# Install node_modules if absent
if (-not (Test-Path "node_modules")) {
    Write-Host "[1/2] Installing npm dependencies (first run only)..." -ForegroundColor Yellow
    & $npmCmd install
    Write-Host "      node_modules ready." -ForegroundColor Green
} else {
    Write-Host "[1/2] node_modules already present." -ForegroundColor Green
}

Write-Host "[2/2] Starting Vite dev server on http://localhost:5173 ..." -ForegroundColor Yellow
Write-Host ""
Write-Host "  Dashboard: http://localhost:5173" -ForegroundColor Cyan
Write-Host "  Press Ctrl+C to stop."            -ForegroundColor DarkGray
Write-Host ""

& $npmCmd run dev
