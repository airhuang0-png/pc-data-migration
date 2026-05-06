@echo off
chcp 65001 >nul
title PC迁移助手
cd /d "%~dp0"

echo ================================
echo    PC 迁移助手 v1.0
echo ================================
echo.

rem --- 优先使用打包版本（无需 Node.js）---
set PACKED_EXE=release\win-unpacked\PC迁移助手.exe
if exist "%PACKED_EXE%" (
    echo [启动] 使用打包版本...
    start "" "%PACKED_EXE%"
    exit /b 0
)

rem --- 打包版本不存在，检查 Node.js ---
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未找到打包版本，且未安装 Node.js
    echo.
    echo 请在开发机上运行: npm run package
    echo 然后将 release 目录复制到本机即可使用
    pause
    exit /b 1
)

rem --- 开发模式 ---
echo [启动] 使用开发模式...

if not exist "node_modules\" (
    echo [1/3] 正在安装依赖...
    call npm install
    if errorlevel 1 (
        echo [错误] 依赖安装失败
        pause
        exit /b 1
    )
)

echo [2/2] 正在启动应用...
echo.
npm run dev
pause
