# PC迁移助手 启动脚本
Set-Location $PSScriptRoot

Write-Host "================================" -ForegroundColor Cyan
Write-Host "   PC 迁移助手 v1.0" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Check Node.js
$nodePath = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodePath) {
    Write-Host "[错误] 未找到 Node.js，请先安装 Node.js" -ForegroundColor Red
    Write-Host "下载地址: https://nodejs.org" -ForegroundColor Yellow
    Read-Host "按回车退出"
    exit 1
}

# Check node_modules
if (-not (Test-Path "node_modules")) {
    Write-Host "[1/2] 正在安装依赖..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[错误] 依赖安装失败" -ForegroundColor Red
        Read-Host "按回车退出"
        exit 1
    }
}

# Check electron
$electronBinary = "node_modules\electron\dist\electron.exe"
if (-not (Test-Path $electronBinary)) {
    Write-Host "[2/2] 正在下载 Electron (约100MB，仅首次)..." -ForegroundColor Yellow
    npm install electron --save-dev
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[警告] Electron 下载失败，将使用浏览器预览模式" -ForegroundColor Yellow
        Write-Host "启动浏览器预览..." -ForegroundColor Green
        npx vite --open
        Read-Host "按回车退出"
        exit 0
    }
}

Write-Host "启动应用..." -ForegroundColor Green
npx concurrently "npx vite" "npx wait-on http://localhost:5173 && npx electron ."
