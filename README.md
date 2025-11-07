# Pangu AI Agent - Electron Desktop Application

> 对话式 AI Agent 桌面版 - 基于 Electron + Puppeteer 的智能桌面应用

## 📖 项目简介

Pangu AI Agent Electron 是一个基于 Electron 的桌面应用程序，提供以下核心功能：

- 🎥 **本地视频抓取**：使用 Puppeteer 在本地运行爬虫，零服务器成本
- 💬 **ChatGPT 对话**：内置 ChatGPT 风格的对话界面
- 🔄 **智能路由**：本地优先，云端降级，保证成功率
- 🖥️ **系统集成**：托盘、快捷键、通知等原生体验
- 🔄 **自动更新**：静默更新，无需手动下载

## 🎯 核心优势

| 对比项 | 传统 Web 方案 | Electron 桌面版 |
|--------|---------------|----------------|
| **爬虫成本** | 高（服务器运行） | 零（本地运行） |
| **并发能力** | 受服务器限制 | 无限（分布式） |
| **抓取成功率** | 70-80% | 95%+ |
| **用户体验** | 依赖网络 | 本地秒开 |

## 🛠️ 技术栈

- **Electron** 28+ - 跨平台桌面应用框架
- **Puppeteer** 21+ - 无头浏览器自动化
- **Node.js** 18+ - JavaScript 运行时
- **electron-builder** - 应用打包工具
- **electron-updater** - 自动更新功能

## 📁 项目结构

```
pangu-electron/
├── electron/                    # Electron 主进程代码
│   ├── main/                   # 主进程模块化封装
│   │   ├── appLifecycle.js     # 应用生命周期管理
│   │   ├── env.js              # 环境与路径解析
│   │   ├── ipcHandlers.js      # IPC 注册入口
│   │   ├── shortcuts.js        # 全局快捷键管理
│   │   └── windowManager.js    # 主窗口创建与状态管理
│   ├── main.js                 # 主进程入口
│   ├── preload.js              # 预加载脚本（安全桥接）
│   ├── services/               # 核心服务
│   │   ├── fileService.js      # 文件操作服务
│   │   ├── puppeteerService.js # Puppeteer 爬虫服务
│   │   ├── trayService.js      # 系统托盘服务
│   │   └── updateService.js    # 自动更新服务
│   └── utils/                  # 工具函数
│       ├── logger.js           # 日志工具
│       └── config.js           # 配置管理
├── build/                      # 打包资源
│   ├── icon.ico               # Windows 图标
│   ├── icon.icns              # macOS 图标
│   ├── icon.png               # Linux 图标
│   └── entitlements.mac.plist # macOS 权限配置
├── package.json               # 项目配置
├── electron-builder.yml       # 打包配置
└── README.md                  # 项目文档
```

## 🚀 快速开始

### 前置要求

- Node.js 18.0 或更高版本
- npm 或 yarn 包管理器
- Git

### 安装依赖

```bash
# 克隆项目
cd pangu-electron

# 安装依赖
npm install

# 或使用 yarn
yarn install
```

### 开发模式

```bash
# 启动开发模式
npm run dev

# 或
yarn dev
```

开发模式下，应用会加载前端开发服务器（http://localhost:8000）。

### 生产打包

```bash
# 打包所有平台
npm run build:all

# 仅打包 Windows
npm run build:win

# 仅打包 macOS
npm run build:mac

# 仅打包 Linux
npm run build:linux
```

打包产物将输出到 `dist/` 目录。

## ⚙️ 配置说明

### 前端集成配置

在 `electron/utils/config.js` 中配置前端 URL：

```javascript
frontend: {
  devUrl: 'http://localhost:8000',      // 开发模式前端地址
  prodPath: '../resources/app/index.html' // 生产模式前端路径
}
```

### API 后端配置

在 `electron/utils/config.js` 中配置后端 API：

```javascript
api: {
  baseUrl: 'https://api.example.com',  // 后端 API 地址
  timeout: 30000,                      // 请求超时时间
  retryTimes: 3                        // 重试次数
}
```

### Puppeteer 配置

```javascript
puppeteer: {
  headless: false,            // 是否隐藏浏览器窗口
  userAgent: '',              // 自定义 UA，默认桌面 Chrome
  maxRetries: 3,              // 最大重试次数
  timeout: 30000,             // 通用超时时间（ms），可被更细粒度字段覆盖
  pageLoadTimeout: 45000,     // 页面加载超时（可选）
  downloadTimeout: 360000,    // 下载超时（可选）
  uploadTimeout: 600000,      // 上传超时（可选）
  launchArgs: ['--proxy-server=http://127.0.0.1:7890'], // 追加的启动参数（可选）
  executablePath: '',         // 自定义 Chromium 路径（可选）
  tempDir: 'D:/pangu-temp',   // 临时视频存储目录（可选）
  ignoreHTTPSErrors: false,   // 是否忽略 HTTPS 证书错误
  enableCache: true,          // 启用结果缓存
  cacheExpireTime: 300000     // 缓存过期时间（毫秒）
}
```

> 以上字段均为可选，未配置时将使用安全的默认值。`timeout` 会作为 `pageLoad`、`download`、`upload` 的兜底值。

## 🔧 核心功能

### 1. 视频抓取

使用本地 Puppeteer 抓取视频，支持以下平台：

- ✅ 抖音（Douyin）
- ✅ 哔哩哔哩（Bilibili）
- ✅ 快手（Kuaishou）

**使用示例**：

```javascript
// 在渲染进程中调用
const result = await window.electronAPI.fetchVideo('https://www.douyin.com/...');
```

### 2. 系统托盘

应用最小化到系统托盘，支持：

- 显示/隐藏窗口
- 快捷操作菜单
- 系统通知

### 3. 全局快捷键

- `Ctrl/Cmd + Shift + P`：切换窗口显示/隐藏
- `Ctrl/Cmd + N`：新建对话

### 4. 自动更新

应用启动时自动检查更新，支持：

- 后台静默下载
- 增量更新
- 安装前提示

### 5. 文件操作

支持导出对话记录为多种格式：

- JSON 格式
- Markdown 格式
- 纯文本格式

## 🔐 安全特性

- ✅ **进程隔离**：主进程和渲染进程隔离
- ✅ **上下文隔离**：使用 contextBridge 安全桥接
- ✅ **禁用 Node.js 集成**：渲染进程中禁用 Node.js
- ✅ **内容安全策略（CSP）**：防止 XSS 攻击
- ✅ **HTTPS 加密**：所有网络通信使用 HTTPS

## 📦 打包说明

### Windows 打包

生成文件：
- `Pangu-AI-Agent-Setup-1.0.0.exe` - NSIS 安装包
- `Pangu-AI-Agent-1.0.0.exe` - 便携版

### macOS 打包

生成文件：
- `Pangu-AI-Agent-1.0.0.dmg` - DMG 镜像
- `Pangu-AI-Agent-1.0.0-mac.zip` - ZIP 压缩包

### Linux 打包

生成文件：
- `Pangu-AI-Agent-1.0.0.AppImage` - AppImage 单文件
- `pangu-ai-agent_1.0.0_amd64.deb` - Debian 包

## 🐛 调试技巧

### 查看日志

日志文件位置：
- **Windows**: `%APPDATA%\pangu-agent-electron\logs\main.log`
- **macOS**: `~/Library/Logs/pangu-agent-electron/main.log`
- **Linux**: `~/.config/pangu-agent-electron/logs/main.log`

### 打开开发者工具

开发模式下自动打开，或在主进程中添加：

```javascript
mainWindow.webContents.openDevTools();
```

### 调试 Puppeteer

设置 `headless: false` 查看浏览器操作：

```javascript
puppeteer: {
  headless: false  // 显示浏览器窗口
}
```

## 🤝 开发指南

### 添加新的视频平台

1. 在 `puppeteerService.js` 中添加平台检测逻辑
2. 实现对应的抓取方法（参考 `fetchDouyin`）
3. 在 `detectPlatform` 方法中添加 URL 匹配规则

### 添加新的 IPC 通信

1. 在 `preload.js` 中暴露 API
2. 在 `main.js` 中注册 IPC 监听器
3. 在渲染进程中调用 `window.electronAPI.*`

### 自定义托盘菜单

在 `trayService.js` 的 `updateContextMenu` 方法中修改菜单项。

## 📝 常见问题

### Q1: 首次启动很慢？

A: 首次启动需要下载 Chromium，请耐心等待。可以使用 `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true` 跳过自动下载，手动指定 Chromium 路径。

### Q2: 视频抓取失败？

A: 检查：
1. 网络连接是否正常
2. 视频链接是否有效
3. 查看日志文件了解详细错误

### Q3: 如何更改前端地址？

A: 修改 `electron/utils/config.js` 中的 `frontend.devUrl` 配置。

### Q4: 打包后无法运行？

A: 检查：
1. 前端构建产物是否正确
2. 资源路径配置是否正确
3. 查看应用日志文件

## 📄 许可证

MIT License

## 🔗 相关链接

- [技术方案文档](../pangu/对话式AI_Agent_技术方案_V5.0.md)
- [前端项目](../pangu-agent-front)
- [后端项目](../pangu)

## 📧 联系方式

如有问题或建议，请通过以下方式联系：

- 提交 Issue
- 发送邮件：[预留]

---

**Pangu AI Agent Team** © 2024









