@echo off
chcp 65001 >nul
echo ===================================
echo Video Subtitle Player - Electron版
echo ===================================

REM 检查Node.js是否安装
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js未安装，请先安装Node.js ^(https://nodejs.org/^)
    pause
    exit /b 1
)

echo ✅ Node.js版本:
node --version

REM 检查npm是否安装
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm未安装
    pause
    exit /b 1
)

echo ✅ npm版本:
npm --version

REM 安装依赖
echo.
echo 📦 正在安装依赖...
npm install

if %errorlevel% neq 0 (
    echo ❌ 依赖安装失败
    pause
    exit /b 1
)

echo ✅ 依赖安装完成

REM 询问用户要执行的操作
echo.
echo 请选择要执行的操作:
echo 1^) 开发模式运行
echo 2^) 构建Windows版本
echo 3^) 构建macOS版本
echo 4^) 构建Linux版本
echo 5^) 构建所有平台版本
echo 6^) 退出

set /p choice=请输入选择 ^(1-6^): 

if "%choice%"=="1" (
    echo 🚀 启动开发模式...
    npm run dev
) else if "%choice%"=="2" (
    echo 🔨 构建Windows版本...
    npm run build-win
) else if "%choice%"=="3" (
    echo 🔨 构建macOS版本...
    npm run build-mac
) else if "%choice%"=="4" (
    echo 🔨 构建Linux版本...
    npm run build-linux
) else if "%choice%"=="5" (
    echo 🔨 构建所有平台版本...
    npm run build
) else if "%choice%"=="6" (
    echo 👋 退出
    exit /b 0
) else (
    echo ❌ 无效选择
    pause
    exit /b 1
)

pause