# ============================================================
# EV Battery Monitoring System — Backend Startup Script
# Run this from the MINI PRO root folder:
#   powershell -ExecutionPolicy Bypass -File start_backend.ps1
# ============================================================

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host "  EV Battery Safety Monitoring — Python Backend"       -ForegroundColor Cyan
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Navigate to backend directory
Set-Location "$PSScriptRoot\backend"

# Step 2: Check if a virtual environment exists; create it if not
if (-not (Test-Path "venv\Scripts\python.exe")) {
    Write-Host "[1/4] Creating Python virtual environment..." -ForegroundColor Yellow
    python -m venv venv
    Write-Host "      Virtual environment created." -ForegroundColor Green
} else {
    Write-Host "[1/4] Virtual environment already exists." -ForegroundColor Green
}

# Step 3: Install / update requirements
Write-Host "[2/4] Installing / verifying dependencies from requirements.txt..." -ForegroundColor Yellow
& "venv\Scripts\python.exe" -m pip install -r requirements.txt --quiet
Write-Host "      Dependencies ready." -ForegroundColor Green

# Step 4: Check for .env file
if (-not (Test-Path ".env")) {
    Write-Host "[3/4] No .env found. Copying from .env.example..." -ForegroundColor Yellow
    Copy-Item "..\\.env.example" ".env"
    Write-Host "      .env created. Edit it to set MQTT broker IP, Wi-Fi credentials, etc." -ForegroundColor Green
} else {
    Write-Host "[3/4] .env file present." -ForegroundColor Green
}

# Step 5: Start the FastAPI backend
Write-Host "[4/4] Starting FastAPI backend on http://localhost:8000 ..." -ForegroundColor Yellow
Write-Host ""
Write-Host "  API Docs  : http://localhost:8000/docs"      -ForegroundColor Cyan
Write-Host "  WebSocket : ws://localhost:8000/ws/telemetry" -ForegroundColor Cyan
Write-Host "  Press Ctrl+C to stop."                        -ForegroundColor DarkGray
Write-Host ""

& "venv\Scripts\python.exe" -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
