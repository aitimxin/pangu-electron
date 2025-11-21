const { app, BrowserWindow } = require('electron');
const logger = require('../utils/logger');

function registerAppLifecycle({ createMainWindow, getMainWindow, onBeforeQuit }) {
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    } else {
      const window = getMainWindow();
      if (window) {
        window.show();
      }
    }
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('before-quit', async () => {
    app.isQuitting = true;
    logger.info('Application quitting...');

    try {
      if (typeof onBeforeQuit === 'function') {
        await onBeforeQuit();
      }
    } finally {
      logger.info('Cleanup completed');
    }
  });
}

module.exports = registerAppLifecycle;

















