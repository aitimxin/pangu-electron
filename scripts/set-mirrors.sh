#!/bin/bash
# macOS/Linux 环境变量设置脚本 - 用于加速依赖下载
# 在运行 npm install 之前执行此脚本

echo "======================================"
echo "设置 Electron 和 Puppeteer 下载镜像"
echo "======================================"

# 设置 Electron 镜像
export ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
export ELECTRON_CUSTOM_DIR='{{ version }}'

# 设置 Puppeteer 镜像
export PUPPETEER_DOWNLOAD_BASE_URL=https://npmmirror.com/mirrors/chrome-for-testing

echo ""
echo "环境变量已设置："
echo "ELECTRON_MIRROR=$ELECTRON_MIRROR"
echo "PUPPETEER_DOWNLOAD_BASE_URL=$PUPPETEER_DOWNLOAD_BASE_URL"
echo ""
echo "现在可以运行: npm install"
echo "======================================"













