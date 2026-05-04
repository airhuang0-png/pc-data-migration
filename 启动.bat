@echo off
chcp 65001 >nul
title PC迁移助手
cd /d "%~dp0"

echo ================================
echo    PC 迁移助手 v1.0
echo ================================
echo.

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未找到 Node.js，请先安装
    echo https://nodejs.org
    pause
    exit /b 1
)

if not exist "node_modules\" (
    echo [1/3] 正在安装依赖，首次约 3-5 分钟...
    call npm install 2>&1
    if errorlevel 1 (
        echo [错误] 依赖安装失败，尝试清理后重试...
        rmdir /s /q node_modules 2>nul
        call npm install --legacy-peer-deps
    )
)

if not exist "node_modules\electron\dist\electron.exe" (
    echo [2/3] 正在下载 Electron，首次约 100MB...
    call npm install electron --save-dev
)

echo [3/3] 正在启动应用...
echo.
npx concurrently "npx vite" "npx wait-on http://localhost:5173 && npx electron ."
pause
