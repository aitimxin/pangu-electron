const { BrowserWindow, app } = require('electron');
const path = require('path');
const logger = require('../utils/logger');
const config = require('../utils/config');
const { resolveFrontendTarget, isDev } = require('./env');

let mainWindow = null;

function getWindowConfig() {
  const windowConfig = config.getWindowConfig();
  return {
    width: windowConfig.width || 1200,
    height: windowConfig.height || 800,
    x: windowConfig.x,
    y: windowConfig.y
  };
}

function createMainWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    return mainWindow;
  }

  logger.info('Creating main window...');
  const userWindowConfig = getWindowConfig();

  mainWindow = new BrowserWindow({
    ...userWindowConfig,
    minWidth: 900,
    minHeight: 600,
    frame: true,
    titleBarStyle: 'default',
    backgroundColor: '#ffffff',
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, '../preload.js'),
      webSecurity: true,
      allowRunningInsecureContent: false
    }
  });

  attachWindowEvents(mainWindow);
  mainWindow.webContents.setWindowOpenHandler(({ url, features }) => {
    logger.info('Window open requested:', url, features);
    return {
      action: 'allow',
      overrideBrowserWindowOptions: {
        parent: mainWindow,
        modal: false,
        autoHideMenuBar: true,
        show: true,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          enableRemoteModule: false,
          preload: path.join(__dirname, '../preload.js'),
          webSecurity: true,
          allowRunningInsecureContent: false
        }
      }
    };
  });
  loadFrontend(mainWindow);

  return mainWindow;
}

function attachWindowEvents(window) {
  window.once('ready-to-show', () => {
    logger.info('Window ready to show');
    window.show();

    if (config.get('app.firstRun')) {
      logger.info('First run detected');
      config.set('app.firstRun', false);
    }
  });

  window.on('close', (event) => {
    if (config.get('app.minimizeToTray') && !app.isQuitting) {
      event.preventDefault();
      window.hide();
      logger.info('Window hidden to tray');
      return;
    }

    const bounds = window.getBounds();
    config.saveWindowState(bounds);
    logger.info('Window state saved');
  });

  window.on('closed', () => {
    mainWindow = null;
    logger.info('Window closed');
  });

  window.on('maximize', () => {
    const target = getMainWindow();
    if (target) {
      target.webContents.send('window-maximized', true);
    }
  });

  window.on('unmaximize', () => {
    const target = getMainWindow();
    if (target) {
      target.webContents.send('window-maximized', false);
    }
  });
}

function loadFrontend(window) {
  const target = resolveFrontendTarget();
  logger.info('Loading frontend:', target.value);

  if (target.type === 'url') {
    // 添加错误处理
    window.webContents.once('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
      logger.error('Failed to load frontend:', { errorCode, errorDescription, validatedURL });
      
      // 显示友好的错误页面
      const errorHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>前端服务未启动</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: #333;
            }
            .container {
              background: white;
              padding: 40px;
              border-radius: 12px;
              box-shadow: 0 10px 40px rgba(0,0,0,0.2);
              max-width: 600px;
              text-align: center;
            }
            h1 {
              color: #667eea;
              margin-bottom: 20px;
            }
            p {
              line-height: 1.6;
              color: #666;
              margin-bottom: 30px;
            }
            .code {
              background: #f5f5f5;
              padding: 15px;
              border-radius: 6px;
              font-family: 'Courier New', monospace;
              color: #333;
              margin: 20px 0;
              text-align: left;
            }
            .button {
              background: #667eea;
              color: white;
              padding: 12px 24px;
              border: none;
              border-radius: 6px;
              cursor: pointer;
              font-size: 16px;
              margin-top: 20px;
            }
            .button:hover {
              background: #5568d3;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>⚠️ 前端开发服务器未启动</h1>
            <p>Electron 应用需要前端开发服务器运行在 <strong>${target.value}</strong></p>
            <p>请按照以下步骤操作：</p>
            <div class="code">
              1. 打开终端，进入 pangu-agent-front 目录<br>
              2. 运行命令：<strong>npm run dev</strong><br>
              3. 等待前端服务器启动（通常会在 http://localhost:8000）<br>
              4. 然后重新启动 Electron 应用
            </div>
            <button class="button" onclick="location.reload()">刷新页面</button>
          </div>
        </body>
        </html>
      `;
      
      window.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(errorHtml)}`);
    });

    window.loadURL(target.value).catch((error) => {
      logger.error('Error loading URL:', error);
    });
    
    if (isDev) {
      window.webContents.openDevTools();
    }
    return;
  }

  window.loadFile(target.value);
}

function getMainWindow() {
  return mainWindow;
}

module.exports = {
  createMainWindow,
  getMainWindow
};






