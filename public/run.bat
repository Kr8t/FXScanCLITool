@echo off
REM ═══════════════════════════════════════════════════════════════
REM  FX SCAN — Windows Batch Launcher
REM  Requires: Python 3.10+ with fx-scan installed
REM ═══════════════════════════════════════════════════════════════

title FX SCAN

echo.
echo  ╔═══════════════════════════════════════════════════╗
echo  ║       FX SCAN — Major FX Pair Signal Scanner     ║
echo  ║                                                   ║
echo  ║  Inside Day: Close INSIDE previous day's range    ║
echo  ║  CIB: Close OUTSIDE previous day's range          ║
echo  ╚═══════════════════════════════════════════════════╝
echo.

REM Check Python is available
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found. Please install Python 3.10+
    echo         https://www.python.org/downloads/
    pause
    exit /b 1
)

REM Check if required packages are installed
python -c "import yfinance" >nul 2>&1
if errorlevel 1 (
    echo [INFO] Installing required packages...
    pip install yfinance rich pandas
    if errorlevel 1 (
        echo [ERROR] Installation failed.
        pause
        exit /b 1
    )
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
echo [INFO] Clearing old cache...
python -m fx_scan.cli --clear-cache >nul 2>&1

REM Run the scanner with force flag to bypass cache
echo [INFO] Fetching fresh market data from Yahoo Finance...
echo [INFO] Note: Only COMPLETED daily candles are analyzed
echo [INFO]       (Today's candle is excluded until 5pm ET)
echo.
python -m fx_scan.cli --force %*

echo.
echo ═══════════════════════════════════════════════════════════
echo [DONE] Press any key to exit...
pause >nul
