@echo off
setlocal
cd /d "%~dp0\gemini_web2api_server"
set PYTHONPATH=%CD%
python -m gemini_web2api --config config.json
pause
