@echo off
:: ─────────────────────────────────────────────────────────────────────────────
::  Dataset Lab  ─  Windows Quick-Start
::  Double-click this file to start the app, or run from Command Prompt.
:: ─────────────────────────────────────────────────────────────────────────────
title Dataset Lab

:: Check if install.py has been run (venv must exist)
if not exist "dataset-lab\.venv\Scripts\python.exe" (
    echo.
    echo  [!] Setup not found. Running installer first...
    echo.
    python install.py
    if errorlevel 1 (
        echo.
        echo  [ERROR] Install failed. Please check the output above.
        pause
        exit /b 1
    )
)

:: Start using the CLI runner
echo.
echo  ^> Starting Dataset Lab...
echo.
python datasetlab.py start

echo.
echo  Press any key to stop the servers and exit...
pause > nul

python datasetlab.py stop
