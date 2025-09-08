#!/bin/bash

echo "==================================="
echo "Video Subtitle Player - Electron版"
echo "==================================="

# 检查Node.js是否安装
if ! command -v node &> /dev/null; then
    echo "❌ Node.js未安装，请先安装Node.js (https://nodejs.org/)"
    exit 1
fi

echo "✅ Node.js版本: $(node --version)"

# 检查npm是否安装
if ! command -v npm &> /dev/null; then
    echo "❌ npm未安装"
    exit 1
fi

echo "✅ npm版本: $(npm --version)"

# 安装依赖
echo ""
echo "📦 正在安装依赖..."
npm install

if [ $? -eq 0 ]; then
    echo "✅ 依赖安装完成"
else
    echo "❌ 依赖安装失败"
    exit 1
fi

# 询问用户要执行的操作
echo ""
echo "请选择要执行的操作:"
echo "1) 开发模式运行"
echo "2) 构建Windows版本"
echo "3) 构建macOS版本"
echo "4) 构建Linux版本"
echo "5) 构建所有平台版本"
echo "6) 退出"

read -p "请输入选择 (1-6): " choice

case $choice in
    1)
        echo "🚀 启动开发模式..."
        npm run dev
        ;;
    2)
        echo "🔨 构建Windows版本..."
        npm run build-win
        ;;
    3)
        echo "🔨 构建macOS版本..."
        npm run build-mac
        ;;
    4)
        echo "🔨 构建Linux版本..."
        npm run build-linux
        ;;
    5)
        echo "🔨 构建所有平台版本..."
        npm run build
        ;;
    6)
        echo "👋 退出"
        exit 0
        ;;
    *)
        echo "❌ 无效选择"
        exit 1
        ;;
esac