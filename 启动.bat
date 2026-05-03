@echo off
chcp 65001 >nul
title PC迁移助手
cd /d "%~dp0"

echo ================================
echo    PC 迁移助手
echo ================================
echo.

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未找到 Node.js
    echo 请先安装: https://nodejs.org
    pause
    exit /b 1
)

if not exist "node_modules\" (
    echo [安装] 正在安装依赖...
    npm install
)

echo [启动] 正在启动应用...
npm run dev
pause
