@echo off
chcp 65001 >nul
title PC迁移助手 - 安装与启动

cd /d "%~dp0"

echo ================================
echo    PC 迁移助手 v1.0
echo ================================
echo.

if not exist "node_modules\" (
    echo [1/2] 正在安装依赖，首次运行需 3-5 分钟...
    echo.
    call npm install 2>&1
    if errorlevel 1 (
        echo.
        echo ⚠ npm install 失败，尝试清理后重试...
        rmdir /s /q node_modules 2>nul
        call npm install --legacy-peer-deps
    )
    echo.
    echo [2/2] 正在下载 Electron（约 100MB）...
    call npm install electron --save-dev 2>&1
    echo.
)

echo 正在启动应用...
echo.
call npx concurrently "npx vite" "npx wait-on http://localhost:5173 && npx electron ."
pause
