# Pangu Electron 快速启动指南

## 📋 前置准备

确保您已经安装以下软件：

- [Node.js](https://nodejs.org/) 18.0 或更高版本
- npm 或 yarn 包管理器
- Git

## 🚀 快速开始

### 1️⃣ 安装依赖

```bash
# 进入项目目录
cd pangu-electron

# 安装依赖（首次安装可能需要较长时间，因为需要下载 Chromium）
npm install

# 或使用国内镜像加速
npm install --registry=https://registry.npmmirror.com
```

### 2️⃣ 配置环境

```bash
# 复制环境配置文件
cp .env.example .env

# 编辑 .env 文件，填入您的配置
# 特别注意：
# - FRONTEND_DEV_URL: 前端开发服务器地址（默认 http://localhost:8000）
# - API_BASE_URL: 后端 API 地址
```

### 3️⃣ 启动前端项目（必须）

在启动 Electron 之前，需要先启动前端开发服务器：

```bash
# 在另一个终端窗口中
cd ../pangu-agent-front
npm install
npm start

# 确保前端服务运行在 http://localhost:8000
```

### 4️⃣ 启动 Electron 应用

```bash
# 回到 pangu-electron 目录
cd pangu-electron

# 启动开发模式
npm run dev
```

## 🎯 开发模式说明

开发模式下：

- ✅ 应用会加载前端开发服务器（http://localhost:8000）
- ✅ 自动打开开发者工具
- ✅ 支持热重载（需要重启 Electron）
- ✅ 启用详细日志输出

## 📦 生产打包

### 打包前准备

1. **构建前端项目**：

```bash
cd ../pangu-agent-front
npm run build

# 确保构建产物在 dist/ 目录
```

2. **准备图标文件**：

将应用图标放置在 `build/` 目录下：
- `icon.ico` - Windows 图标
- `icon.icns` - macOS 图标
- `icon.png` - Linux 图标

### 开始打包

```bash
# 回到 pangu-electron 目录
cd ../pangu-electron

# 打包当前平台
npm run build

# 或打包指定平台
npm run build:win    # Windows
npm run build:mac    # macOS
npm run build:linux  # Linux

# 或打包所有平台
npm run build:all
```

### 打包产物

打包完成后，安装包位于 `dist/` 目录：

**Windows**:
- `Pangu-AI-Agent-Setup-1.0.0.exe` - 安装程序
- `Pangu-AI-Agent-1.0.0.exe` - 便携版

**macOS**:
- `Pangu-AI-Agent-1.0.0.dmg` - 磁盘映像
- `Pangu-AI-Agent-1.0.0-mac.zip` - 压缩包

**Linux**:
- `Pangu-AI-Agent-1.0.0.AppImage` - AppImage 格式
- `pangu-ai-agent_1.0.0_amd64.deb` - Debian 包

## 🐛 常见问题

### Q1: 安装依赖时下载 Chromium 很慢？

**解决方案**：

```bash
# 使用国内镜像
npm config set puppeteer_download_host=https://npmmirror.com/mirrors
npm install
```

或者在项目中已经配置了 `.npmrc` 文件，确保内容如下：

```
registry=https://registry.npmmirror.com
electron_mirror=https://npmmirror.com/mirrors/electron/
puppeteer_download_host=https://npmmirror.com/mirrors
```

### Q2: 启动后显示"前端加载失败"？

**原因**：前端开发服务器未启动

**解决方案**：

1. 确保前端项目已启动（http://localhost:8000）
2. 检查 `.env` 文件中的 `FRONTEND_DEV_URL` 配置
3. 查看控制台日志，确认加载的 URL

### Q3: Puppeteer 初始化失败？

**可能原因**：
- Chromium 未正确下载
- 系统缺少依赖库（Linux）

**解决方案**：

**Windows/macOS**: 重新安装依赖
```bash
rm -rf node_modules
npm install
```

**Linux**: 安装系统依赖
```bash
# Ubuntu/Debian
sudo apt-get install -y \
  gconf-service libasound2 libatk1.0-0 libcups2 \
  libdbus-1-3 libgconf-2-4 libgtk-3-0 libnspr4 \
  libnss3 libx11-xcb1 libxcomposite1 libxss1 \
  fonts-liberation libappindicator1 xdg-utils

# CentOS/RHEL
sudo yum install -y \
  pango libXcomposite libXcursor libXdamage \
  libXext libXi libXtst cups-libs libXScrnSaver \
  libXrandr alsa-lib liberation-fonts
```

### Q4: 打包时提示找不到前端文件？

**原因**：前端未构建或路径配置错误

**解决方案**：

1. 确保前端已构建：
```bash
cd ../pangu-agent-front
npm run build
```

2. 检查 `electron-builder.yml` 中的 `extraResources` 配置：
```yaml
extraResources:
  - from: ../pangu-agent-front/dist
    to: app
```

3. 确认路径正确，相对于 `pangu-electron` 目录

### Q5: Windows Defender 阻止运行？

**原因**：未签名的应用会被 Windows Defender 警告

**解决方案**：

1. 临时解决：点击"更多信息" → "仍要运行"
2. 长期解决：购买代码签名证书并签名应用

### Q6: macOS 提示"无法打开，因为无法验证开发者"？

**解决方案**：

```bash
# 允许运行未签名的应用
sudo xattr -rd com.apple.quarantine /Applications/Pangu\ AI\ Agent.app
```

或在"系统偏好设置" → "安全性与隐私"中点击"仍要打开"

## 📚 下一步

- 阅读 [README.md](./README.md) 了解详细功能
- 查看 [技术方案文档](../pangu/对话式AI_Agent_技术方案_V5.0.md)
- 浏览 [CHANGELOG.md](./CHANGELOG.md) 了解版本更新

## 🆘 获取帮助

如遇到问题：

1. 查看日志文件（位置见 README.md）
2. 搜索已有的 Issues
3. 提交新的 Issue，并附上：
   - 操作系统版本
   - Node.js 版本
   - 详细的错误日志
   - 复现步骤

---

祝您使用愉快！ 🎉

