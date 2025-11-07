/**
 * Main Process
 * Electron 主进程入口
 */

const { app } = require('electron');
const logger = require('./utils/logger');
const puppeteerService = require('./services/puppeteerService');
const trayService = require('./services/trayService');
const updateService = require('./services/updateService');
const fileService = require('./services/fileService');
const registerAppLifecycle = require('./main/appLifecycle');
const { createMainWindow, getMainWindow } = require('./main/windowManager');
const registerIpcHandlers = require('./main/ipcHandlers');
const { registerGlobalShortcuts, unregisterGlobalShortcuts } = require('./main/shortcuts');
const { isDev } = require('./main/env');

function registerProcessErrorHandlers() {
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  });
}

async function bootstrap() {
  logger.info('='.repeat(60));
  logger.info('Pangu AI Agent Electron Starting...');
  logger.info('Version:', app.getVersion());
  logger.info('Platform:', process.platform);
  logger.info('Environment:', isDev ? 'development' : 'production');
  logger.info('='.repeat(60));

  try {
    logger.info('Initializing Puppeteer service...');
    await puppeteerService.initialize();

    const mainWindow = createMainWindow();

    registerIpcHandlers({
      getMainWindow,
      puppeteerService,
      fileService,
      updateService
    });

    trayService.createTray(mainWindow);
    registerGlobalShortcuts(getMainWindow);

    if (!isDev) {
      updateService.initialize(mainWindow);
    }

    logger.info('Application started successfully');
  } catch (error) {
    logger.error('Failed to start application:', error);
    app.quit();
  }
}

app.whenReady().then(bootstrap);

registerAppLifecycle({
  createMainWindow,
  getMainWindow,
  onBeforeQuit: async () => {
    await puppeteerService.cleanup();
    unregisterGlobalShortcuts();
  }
});

registerProcessErrorHandlers();

