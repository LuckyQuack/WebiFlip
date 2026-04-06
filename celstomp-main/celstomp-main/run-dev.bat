@echo off
cd /d "%~dp0celstomp"
echo Server running at http://localhost:8000
echo Press Ctrl+C to stop
echo.

python -m http.server 8000
