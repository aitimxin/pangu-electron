const { ipcMain, dialog, shell, clipboard, Notification } = require('electron');
const path = require('path');
const logger = require('../utils/logger');
const config = require('../utils/config');
const { isDev } = require('./env');

function registerIpcHandlers({ getMainWindow, puppeteerService, fileService, updateService }) {
  logger.info('Registering IPC handlers...');

  ipcMain.handle('fetch-video', async (_event, url) => {
    const taskWindow = getMainWindow();

    try {
      logger.info('========================================');
      logger.info('IPC: 收到视频抓取请求:', url);

      const result = await puppeteerService.fetchVideo(url, (progress) => {
        logger.info('进度:', progress.message);
        if (taskWindow && !taskWindow.isDestroyed()) {
          taskWindow.webContents.send('fetch-progress', progress);
        }
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

  ipcMain.on('cancel-fetch', (_event, taskId) => {
    logger.info('Cancelling fetch:', taskId);
    puppeteerService.cancelFetch(taskId);
  });

  ipcMain.handle('select-file', async (_event, options) => {
    const parentWindow = getMainWindow();
    const result = await dialog.showOpenDialog(parentWindow || undefined, options);
    return result.filePaths;
  });

  ipcMain.handle('generate-pdf', async (_event, payload) => {
    const {
      url,
      savePath,
      pdfOptions,
      waitForSelector,
      waitForSelectorTimeout,
      waitForFunction,
      waitForTimeout,
      cookies: payloadCookies,
    } = payload || {};

    if (!url) {
      return { success: false, error: '缺少 PDF 生成地址' };
    }

    try {
      logger.info('IPC: 开始生成 PDF =>', url);

      let cookies = payloadCookies;
      const parentWindow = getMainWindow && getMainWindow();
      if ((!cookies || cookies.length === 0) && parentWindow && !parentWindow.isDestroyed()) {
        try {
          const targetOrigin = new URL(url).origin;
          cookies = await parentWindow.webContents.session.cookies.get({ url: targetOrigin });
          logger.info('IPC: 获取到会话 Cookie 数量 =>', cookies.length);

          if ((!cookies || cookies.length === 0) && parentWindow.webContents.getURL()) {
            const parentUrl = parentWindow.webContents.getURL();
            try {
              const parentOrigin = new URL(parentUrl).origin;
              const parentCookies =
                (await parentWindow.webContents.session.cookies.get({ url: parentOrigin })) || [];
              if (parentCookies.length > 0) {
                const targetHostname = new URL(url).hostname;
                cookies = parentCookies.map((cookie) => ({
                  ...cookie,
                  domain: targetHostname,
                  url: targetOrigin,
                }));
                logger.info(
                  'IPC: 使用父窗口 Cookie 回填目标域名，数量 =>',
                  cookies.length,
                );
              }
            } catch (fallbackError) {
              logger.warn('IPC: 回填父窗口 Cookie 失败:', fallbackError.message);
            }
          }
        } catch (cookieError) {
          logger.warn('IPC: 获取会话 Cookie 失败:', cookieError.message);
        }
      }

      const defaultFileName = `health-report-${Date.now()}.pdf`;
      let finalPath = savePath;

      if (!finalPath) {
        finalPath = path.join(fileService.getDownloadsPath(), defaultFileName);
      }

      await fileService.ensureDir(path.dirname(finalPath));

      const pdfResult = await puppeteerService.generatePdfFromUrl(url, {
        pdfOptions,
        waitForSelector,
        waitForSelectorTimeout,
        waitForFunction,
        waitForTimeout,
        cookies,
        outputPath: finalPath,
      });

      if (!pdfResult) {
        throw new Error('未获取到 PDF 数据');
      }

      const pdfBuffer =
        Buffer.isBuffer(pdfResult) || pdfResult instanceof Uint8Array
          ? Buffer.from(pdfResult)
          : Buffer.from(pdfResult);

      if (!pdfBuffer || pdfBuffer.length === 0) {
        throw new Error('生成的 PDF 内容为空');
      }

      await fileService.saveFile(finalPath, pdfBuffer);

      const signature = pdfBuffer.slice(0, 4).toString('utf8');
      if (signature !== '%PDF') {
        throw new Error('生成的 PDF 文件无效');
      }

      logger.info('IPC: PDF 已保存 =>', finalPath);
      return {
        success: true,
        filePath: finalPath,
      };
    } catch (error) {
      logger.error('IPC: 生成 PDF 失败:', error);
      return {
        success: false,
        error: error.message || '生成 PDF 失败',
      };
    }
  });

  ipcMain.handle('select-save-path', async (_event, options) => {
    const parentWindow = getMainWindow();
    const result = await dialog.showSaveDialog(parentWindow || undefined, options);
    return result.filePath;
  });

  ipcMain.handle('save-file', async (_event, filePath, data) => {
    return fileService.saveFile(filePath, data);
  });

  ipcMain.on('open-folder', (_event, folderPath) => {
    shell.openPath(folderPath);
  });

  ipcMain.on('minimize-window', () => {
    const window = getMainWindow();
    if (window) {
      window.minimize();
    }
  });

  ipcMain.on('toggle-maximize', () => {
    const window = getMainWindow();
    if (!window) return;

    if (window.isMaximized()) {
      window.unmaximize();
    } else {
      window.maximize();
    }
  });

  ipcMain.on('close-window', () => {
    const window = getMainWindow();
    if (window) {
      window.close();
    }
  });

  ipcMain.on('toggle-window', () => {
    const window = getMainWindow();
    if (!window) return;

    if (window.isVisible()) {
      window.hide();
    } else {
      window.show();
      window.focus();
    }
  });

  ipcMain.on('show-notification', (_event, options) => {
    if (Notification.isSupported()) {
      new Notification(options).show();
    }
  });

  ipcMain.handle('get-config', (_event, key) => config.get(key));

  ipcMain.handle('set-config', (_event, key, value) => {
    config.set(key, value);
    return true;
  });

  ipcMain.handle('check-for-updates', async () => {
    if (isDev) {
      logger.warn('Update check requested in development mode, skipping');
      return null;
    }

    try {
      return await updateService.checkForUpdates();
    } catch (error) {
      logger.error('Failed to check for updates via IPC:', error);
      throw error;
    }
  });

  ipcMain.on('download-update', () => {
    if (isDev) {
      logger.warn('Download update requested in development mode, skipping');
      return;
    }

    updateService.downloadUpdate();
  });

  ipcMain.on('install-update', () => {
    if (isDev) {
      logger.warn('Install update requested in development mode, skipping');
      return;
    }

    updateService.installUpdate();
  });

  ipcMain.on('log', (_event, level, message) => {
    if (typeof logger[level] === 'function') {
      logger[level](message);
    } else {
      logger.info(message);
    }
  });

  ipcMain.handle('get-app-info', () => {
    const { app } = require('electron');
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

  ipcMain.on('open-external', (_event, url) => {
    shell.openExternal(url);
  });

  ipcMain.handle('copy-to-clipboard', (_event, text) => {
    clipboard.writeText(text);
    return true;
  });

  ipcMain.handle('read-from-clipboard', () => clipboard.readText());

  logger.info('IPC handlers registered');
}

module.exports = registerIpcHandlers;

