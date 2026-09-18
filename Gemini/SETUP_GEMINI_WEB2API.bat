@echo off
setlocal
cd /d "%~dp0"
echo [1/2] Installing Web2API dependency...
python -m pip install -r gemini_web2api_server\requirements.txt
if errorlevel 1 (
  echo.
  echo Installation failed. Check that Python is installed and available in PATH.
  pause
  exit /b 1
)
echo [2/2] Syntax check...
python -m compileall -q core gemini_web2api_server\gemini_web2api
if errorlevel 1 (
  echo Syntax check failed.
  pause
  exit /b 1
)
echo.
echo Setup completed. Start Orino Studio and enable Auto-start Gemini Web2API.
pause
