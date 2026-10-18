@echo off
chcp 65001 >nul
cd /d "%~dp0"
if not exist dist\index.html (
  echo Dang build lan dau...
  call npm install && call npm run build || exit /b 1
)
start "" http://localhost:8080/
node tools\serve.mjs dist 8080
