#!/bin/bash

echo "==================================="
echo "启动视频字幕播放器（重构版）"
echo "==================================="

# 检查是否在正确目录
if [ ! -f "index.html" ]; then
    echo "❌ 找不到 index.html 文件"
    echo "请确保在正确的目录下运行此脚本"
    exit 1
fi

# 检查 Node.js 是否安装
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装，请先安装 Node.js"
    exit 1
fi

# 检查 Electron 是否安装
if [ ! -d "node_modules/electron" ]; then
    echo "📦 正在安装依赖..."
    npm install
fi

echo "🚀 启动应用..."
npm start

echo "👋 应用已关闭"