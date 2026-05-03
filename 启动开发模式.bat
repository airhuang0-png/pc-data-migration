@echo off
chcp 65001 >nul
title PC迁移助手 - 开发模式

cd /d "%~dp0"

echo 启动 PC迁移助手 开发模式...
npx concurrently "npx vite" "npx wait-on http://localhost:5173 && npx electron ."
pause
