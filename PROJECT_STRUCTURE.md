# Pangu Electron 项目结构说明

## 📂 完整目录树

```
pangu-electron/
├── electron/                       # Electron 主进程代码
│   ├── main.js                    # ⭐ 主进程入口文件
│   ├── preload.js                 # ⭐ 预加载脚本（IPC 安全桥接）
│   │
│   ├── services/                  # 核心服务模块
│   │   ├── puppeteerService.js   # ⭐ Puppeteer 视频抓取服务
│   │   ├── trayService.js        # 系统托盘服务
│   │   ├── updateService.js      # 自动更新服务
│   │   ├── fileService.js        # 文件操作服务
│   │   └── localApiServer.js     # 本地 API 服务（可选）
│   │
│   └── utils/                     # 工具函数
│       ├── logger.js              # 日志工具
│       └── config.js              # 配置管理
│
├── build/                         # 打包资源
│   ├── icon.ico                  # Windows 图标（需自行添加）
│   ├── icon.icns                 # macOS 图标（需自行添加）
│   ├── icon.png                  # Linux 图标（需自行添加）
│   ├── entitlements.mac.plist    # macOS 权限配置
│   └── icons-readme.txt          # 图标说明文档
│
├── scripts/                       # 辅助脚本
│   └── postinstall.js            # 安装后执行脚本
│
├── dist/                          # 打包输出目录（自动生成）
├── logs/                          # 日志目录（自动生成）
├── temp/                          # 临时文件目录（自动生成）
├── cache/                         # 缓存目录（自动生成）
│
├── package.json                   # ⭐ 项目配置和依赖
├── electron-builder.yml           # ⭐ 打包配置
├── .gitignore                    # Git 忽略配置
├── .npmrc                        # npm 配置（镜像加速）
├── .editorconfig                 # 编辑器配置
├── .eslintrc.js                  # ESLint 配置
│
├── README.md                      # ⭐ 项目说明文档
├── QUICK_START.md                # ⭐ 快速启动指南
├── CHANGELOG.md                  # 更新日志
├── LICENSE                       # 许可证
└── PROJECT_STRUCTURE.md          # 本文档

注：⭐ 标记的是核心文件
```

## 📄 核心文件说明

### 主进程文件

#### `electron/main.js`
**作用**：Electron 主进程入口，应用的核心控制器

**主要功能**：
- 创建和管理应用窗口
- 初始化 Puppeteer 服务
- 注册 IPC 监听器
- 管理系统托盘和快捷键
- 处理应用生命周期

**关键代码**：
```javascript
// 创建窗口
function createWindow() { ... }

// 注册 IPC 处理器
function registerIpcHandlers() { ... }

// 应用启动
app.whenReady().then(() => { ... })
```

#### `electron/preload.js`
**作用**：预加载脚本，在渲染进程加载前运行

**主要功能**：
- 使用 `contextBridge` 暴露安全的 API
- 桥接主进程和渲染进程通信
- 提供统一的前端调用接口

**关键代码**：
```javascript
contextBridge.exposeInMainWorld('electronAPI', {
  fetchVideo: (url) => ipcRenderer.invoke('fetch-video', url),
  // ... 其他 API
});
```

### 服务模块

#### `electron/services/puppeteerService.js`
**作用**：核心爬虫服务，负责视频抓取

**主要功能**：
- 管理 Puppeteer 浏览器实例
- 支持多平台视频抓取（抖音/B站/快手）
- 视频下载和上传
- 任务管理和缓存

**核心方法**：
- `initialize()` - 初始化 Puppeteer
- `fetchVideo(url)` - 抓取视频
- `fetchDouyin/Bilibili/Kuaishou()` - 平台特定实现
- `downloadVideo()` - 下载视频
- `uploadToBackend()` - 上传到后端

#### `electron/services/trayService.js`
**作用**：系统托盘管理

**主要功能**：
- 创建系统托盘图标
- 托盘菜单管理
- 窗口显示/隐藏控制
- 系统通知

#### `electron/services/updateService.js`
**作用**：自动更新管理

**主要功能**：
- 检查应用更新
- 后台下载更新
- 安装更新并重启
- 更新进度通知

#### `electron/services/fileService.js`
**作用**：文件操作服务

**主要功能**：
- 文件读写操作
- 对话记录保存
- 导出功能（JSON/Markdown/Text）
- 临时文件清理

#### `electron/services/localApiServer.js`
**作用**：本地 API 服务器（可选）

**用途**：
- 开发调试
- 提供本地 RESTful API
- 扩展功能接口

### 工具模块

#### `electron/utils/logger.js`
**作用**：日志记录工具

**功能**：
- 统一的日志接口
- 多级别日志（debug/info/warn/error）
- 日志文件管理
- 性能日志

#### `electron/utils/config.js`
**作用**：配置管理工具

**功能**：
- 持久化配置存储
- 配置读写接口
- 默认配置管理
- 窗口状态保存

### 配置文件

#### `package.json`
**核心配置**：
```json
{
  "main": "electron/main.js",     // 主进程入口
  "scripts": {
    "dev": "...",                  // 开发启动
    "build": "...",                // 打包命令
  },
  "dependencies": {
    "electron": "^28.0.0",
    "puppeteer": "^21.6.1",
    // ...
  }
}
```

#### `electron-builder.yml`
**打包配置**：
- 应用 ID、名称、版本
- 打包目标平台
- 资源文件配置
- 自动更新配置
- 代码签名配置

## 🔄 数据流向

### 1. 视频抓取流程

```
用户操作（前端）
    ↓
window.electronAPI.fetchVideo(url)
    ↓
preload.js: ipcRenderer.invoke('fetch-video')
    ↓
main.js: ipcMain.handle('fetch-video')
    ↓
puppeteerService.fetchVideo()
    ↓
[Puppeteer 浏览器操作]
    ↓
下载视频 → 上传到后端 → 返回 CDN URL
    ↓
main.js 返回结果
    ↓
前端接收并显示
```

### 2. 配置管理流程

```
应用启动
    ↓
config.js 加载配置（electron-store）
    ↓
从用户数据目录读取配置
    ↓
提供给各个模块使用
    ↓
配置变更时自动保存
```

### 3. 日志记录流程

```
任意模块
    ↓
logger.info/warn/error()
    ↓
electron-log 处理
    ↓
输出到控制台 + 写入日志文件
    ↓
日志文件位置：
- Windows: %APPDATA%/pangu-agent-electron/logs/
- macOS: ~/Library/Logs/pangu-agent-electron/
- Linux: ~/.config/pangu-agent-electron/logs/
```

## 🔐 安全机制

### 进程隔离
- **主进程**：运行 Node.js，可访问系统 API
- **渲染进程**：运行 Web 页面，受限环境

### IPC 安全桥接
```javascript
// 渲染进程不直接访问 Node.js API
// 通过 contextBridge 暴露白名单 API
contextBridge.exposeInMainWorld('electronAPI', {
  // 只暴露必要的、安全的 API
});
```

### 配置项
```javascript
webPreferences: {
  nodeIntegration: false,      // 禁用 Node.js 集成
  contextIsolation: true,      // 启用上下文隔离
  enableRemoteModule: false,   // 禁用 remote 模块
  webSecurity: true            // 启用 Web 安全
}
```

## 📦 打包机制

### 资源引用

**开发模式**：
```
Electron 主窗口
    ↓
加载 http://localhost:8000 (前端开发服务器)
```

**生产模式**：
```
Electron 打包时
    ↓
从 ../pangu-agent-front/dist 复制前端构建产物
    ↓
到 resources/app/ 目录
    ↓
Electron 主窗口加载 file:///.../resources/app/index.html
```

### 打包流程

```
1. 前端构建
   npm run build (pangu-agent-front)
   ↓
2. Electron 打包
   npm run build (pangu-electron)
   ↓
3. electron-builder 处理
   - 打包 Electron 代码
   - 复制前端资源
   - 生成安装包
   ↓
4. 输出到 dist/ 目录
```

## 🛠️ 扩展指南

### 添加新的 IPC 通信

**步骤**：

1. 在 `preload.js` 中暴露 API：
```javascript
contextBridge.exposeInMainWorld('electronAPI', {
  myNewApi: (param) => ipcRenderer.invoke('my-new-api', param)
});
```

2. 在 `main.js` 中注册处理器：
```javascript
ipcMain.handle('my-new-api', async (event, param) => {
  // 处理逻辑
  return result;
});
```

3. 在前端调用：
```javascript
const result = await window.electronAPI.myNewApi(param);
```

### 添加新的服务模块

**步骤**：

1. 在 `electron/services/` 创建新文件
2. 实现服务类（单例模式）
3. 在 `main.js` 中引入并初始化
4. 通过 IPC 暴露给前端

### 添加新的配置项

**步骤**：

1. 在 `config.js` 的 `schema` 中定义：
```javascript
myConfig: {
  type: 'object',
  properties: {
    myKey: { type: 'string', default: 'value' }
  }
}
```

2. 使用配置：
```javascript
const value = config.get('myConfig.myKey');
config.set('myConfig.myKey', 'newValue');
```

## 📚 相关文档

- [README.md](./README.md) - 项目完整说明
- [QUICK_START.md](./QUICK_START.md) - 快速启动指南
- [CHANGELOG.md](./CHANGELOG.md) - 版本更新记录
- [技术方案](../pangu/对话式AI_Agent_技术方案_V5.0.md) - 完整技术方案

---

**文档版本**：1.0.0  
**最后更新**：2024-11-04

