/**
 * Main Process
 * Electron 主进程入口
 */

const { app, BrowserWindow, ipcMain, dialog, shell, clipboard, globalShortcut } = require('electron');
const path = require('path');
const logger = require('./utils/logger');
const config = require('./utils/config');
const puppeteerService = require('./services/puppeteerService');
const trayService = require('./services/trayService');
const updateService = require('./services/updateService');
const fileService = require('./services/fileService');

// 主窗口引用
let mainWindow = null;

// 开发模式检测
const isDev = process.env.NODE_ENV === 'development';

/**
 * 创建主窗口
 */
function createWindow() {
  logger.info('Creating main window...');

  // 获取窗口配置
  const windowConfig = config.getWindowConfig();

  // 创建窗口
  mainWindow = new BrowserWindow({
    width: windowConfig.width || 1200,
    height: windowConfig.height || 800,
    x: windowConfig.x,
    y: windowConfig.y,
    minWidth: 900,
    minHeight: 600,
    frame: true,
    titleBarStyle: 'default',
    backgroundColor: '#ffffff',
    show: false, // 先隐藏，加载完成后显示
    webPreferences: {
      nodeIntegration: false, // 禁用 Node.js 集成（安全）
      contextIsolation: true, // 启用上下文隔离（安全）
      enableRemoteModule: false, // 禁用 remote 模块（安全）
      preload: path.join(__dirname, 'preload.js'), // 预加载脚本
      webSecurity: true,
      allowRunningInsecureContent: false
    }
  });

  // 加载前端页面
  const frontendUrl = getFrontendUrl();
  logger.info('Loading frontend:', frontendUrl);
  
  if (isDev) {
    // 开发模式：加载开发服务器
    mainWindow.loadURL(frontendUrl);
    // 打开开发者工具
    mainWindow.webContents.openDevTools();
  } else {
    // 生产模式：加载打包后的文件
    mainWindow.loadFile(frontendUrl);
    // 生产模式不打开DevTools，避免Autofill警告
  }

  // 窗口加载完成后显示
  mainWindow.once('ready-to-show', () => {
    logger.info('Window ready to show');
    mainWindow.show();
    
    // 首次运行提示
    if (config.get('app.firstRun')) {
      logger.info('First run detected');
      config.set('app.firstRun', false);
      // 可以显示欢迎页面或教程
    }
  });

  // 监听窗口关闭
  mainWindow.on('close', (event) => {
    // 如果配置为最小化到托盘，则阻止关闭
    if (config.get('app.minimizeToTray') && !app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      logger.info('Window hidden to tray');
    } else {
      // 保存窗口状态
      const bounds = mainWindow.getBounds();
      config.saveWindowState(bounds);
      logger.info('Window state saved');
    }
  });

  // 窗口关闭后
  mainWindow.on('closed', () => {
    mainWindow = null;
    logger.info('Window closed');
  });

  // 监听窗口最大化/还原
  mainWindow.on('maximize', () => {
    mainWindow.webContents.send('window-maximized', true);
  });

  mainWindow.on('unmaximize', () => {
    mainWindow.webContents.send('window-maximized', false);
  });

  return mainWindow;
}

/**
 * 获取前端 URL
 */
function getFrontendUrl() {
  if (isDev) {
    return config.get('frontend.devUrl', 'http://localhost:8000');
  } else {
    return path.join(__dirname, '../resources/app/index.html');
  }
}

/**
 * 注册 IPC 监听器
 */
function registerIpcHandlers() {
  logger.info('Registering IPC handlers...');

  // ============ 视频抓取 ============
  ipcMain.handle('fetch-video', async (event, url) => {
    try {
      logger.info('========================================');
      logger.info('IPC: 收到视频抓取请求:', url);
      
      const result = await puppeteerService.fetchVideo(url, (progress) => {
        // 发送进度到渲染进程
        logger.info('进度:', progress.message);
        mainWindow.webContents.send('fetch-progress', progress);
      });
      
      logger.info('IPC: 视频抓取成功，返回结果:', JSON.stringify(result, null, 2));
      logger.info('========================================');
      
      return { success: true, data: result };
    } catch (error) {
      logger.error('========================================');
      logger.error('IPC: 视频抓取失败:', error.message);
      logger.error('错误堆栈:', error.stack);
      logger.error('========================================');
      
      return { success: false, error: error.message };
    }
  });

  ipcMain.on('cancel-fetch', (event, taskId) => {
    logger.info('Cancelling fetch:', taskId);
    puppeteerService.cancelFetch(taskId);
  });

  // ============ 文件操作 ============
  ipcMain.handle('select-file', async (event, options) => {
    const result = await dialog.showOpenDialog(mainWindow, options);
    return result.filePaths;
  });

  ipcMain.handle('select-save-path', async (event, options) => {
    const result = await dialog.showSaveDialog(mainWindow, options);
    return result.filePath;
  });

  ipcMain.handle('save-file', async (event, filePath, data) => {
    return await fileService.saveFile(filePath, data);
  });

  ipcMain.on('open-folder', (event, folderPath) => {
    shell.openPath(folderPath);
  });

  // ============ 窗口控制 ============
  ipcMain.on('minimize-window', () => {
    if (mainWindow) mainWindow.minimize();
  });

  ipcMain.on('toggle-maximize', () => {
    if (mainWindow) {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
      } else {
        mainWindow.maximize();
      }
    }
  });

  ipcMain.on('close-window', () => {
    if (mainWindow) mainWindow.close();
  });

  ipcMain.on('toggle-window', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
      }
    }
  });

  // ============ 通知 ============
  ipcMain.on('show-notification', (event, options) => {
    const { Notification } = require('electron');
    if (Notification.isSupported()) {
      new Notification(options).show();
    }
  });

  // ============ 配置管理 ============
  ipcMain.handle('get-config', (event, key) => {
    return config.get(key);
  });

  ipcMain.handle('set-config', (event, key, value) => {
    config.set(key, value);
    return true;
  });

  // ============ 日志 ============
  ipcMain.on('log', (event, level, message) => {
    logger[level](message);
  });

  // ============ 应用信息 ============
  ipcMain.handle('get-app-info', () => {
    return {
      name: app.getName(),
      version: app.getVersion(),
      platform: process.platform,
      arch: process.arch,
      electron: process.versions.electron,
      chrome: process.versions.chrome,
      node: process.versions.node
    };
  });

  ipcMain.handle('get-system-info', () => {
    const os = require('os');
    return {
      platform: os.platform(),
      release: os.release(),
      arch: os.arch(),
      cpus: os.cpus().length,
      memory: os.totalmem(),
      freeMemory: os.freemem()
    };
  });

  // ============ 其他工具 ============
  ipcMain.on('open-external', (event, url) => {
    shell.openExternal(url);
  });

  ipcMain.handle('copy-to-clipboard', (event, text) => {
    clipboard.writeText(text);
    return true;
  });

  ipcMain.handle('read-from-clipboard', () => {
    return clipboard.readText();
  });

  logger.info('IPC handlers registered');
}

/**
 * 注册全局快捷键
 */
function registerGlobalShortcuts() {
  const shortcuts = config.getShortcuts();
  
  // 切换窗口显示/隐藏
  if (shortcuts.toggleWindow) {
    globalShortcut.register(shortcuts.toggleWindow, () => {
      if (mainWindow) {
        if (mainWindow.isVisible()) {
          mainWindow.hide();
        } else {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    });
    logger.info('Global shortcut registered:', shortcuts.toggleWindow);
  }
}

/**
 * 应用启动
 */
app.whenReady().then(async () => {
  logger.info('='.repeat(60));
  logger.info('Pangu AI Agent Electron Starting...');
  logger.info('Version:', app.getVersion());
  logger.info('Platform:', process.platform);
  logger.info('Environment:', isDev ? 'development' : 'production');
  logger.info('='.repeat(60));

  try {
    // 初始化 Puppeteer 服务
    logger.info('Initializing Puppeteer service...');
    await puppeteerService.initialize();

    // 创建主窗口
    createWindow();

    // 注册 IPC 监听器
    registerIpcHandlers();

    // 创建系统托盘
    trayService.createTray(mainWindow);

    // 注册全局快捷键
    registerGlobalShortcuts();

    // 初始化自动更新
    if (!isDev) {
      updateService.initialize(mainWindow);
    }

    logger.info('Application started successfully');
  } catch (error) {
    logger.error('Failed to start application:', error);
    app.quit();
  }
});

// macOS 特殊处理：点击 Dock 图标时重新创建窗口
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  } else if (mainWindow) {
    mainWindow.show();
  }
});

// 所有窗口关闭时的处理
app.on('window-all-closed', () => {
  // macOS 下通常不会退出应用
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 应用退出前的清理
app.on('before-quit', async () => {
  app.isQuitting = true;
  logger.info('Application quitting...');
  
  // 清理 Puppeteer
  await puppeteerService.cleanup();
  
  // 注销全局快捷键
  globalShortcut.unregisterAll();
  
  logger.info('Cleanup completed');
});

// 未捕获的异常处理
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

