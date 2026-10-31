@echo off
REM ═══════════════════════════════════════════════════════════════
REM  FX SCAN — Windows Batch Launcher
REM  Requires: Python 3.10+ with fx-scan installed
REM ═══════════════════════════════════════════════════════════════

title FX SCAN

echo.
echo  ╔═══════════════════════════════════════╗
echo  ║       FX SCAN — FX Pair Scanner      ║
echo  ╚═══════════════════════════════════════╝
echo.

REM Check Python is available
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found. Please install Python 3.10+
    echo         https://www.python.org/downloads/
    pause
    exit /b 1
)

REM Check if fx-scan is installed
python -c "import fx_scan" >nul 2>&1
if errorlevel 1 (
    echo [INFO] fx-scan not installed. Installing...
    pip install -e .
    if errorlevel 1 (
        echo [ERROR] Installation failed.
        pause
        exit /b 1
    )
)

REM Clear cache to ensure fresh data
echo [INFO] Clearing cache for fresh data...
python -m fx_scan.cli --clear-cache >nul 2>&1

REM Run the scanner with force flag to bypass cache
echo [INFO] Starting FX scan (fetching fresh data)...
echo.
python -m fx_scan.cli --force %*

echo.
echo [DONE] Press any key to exit...
pause >nul
