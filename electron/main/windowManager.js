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
    window.loadURL(target.value);
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

