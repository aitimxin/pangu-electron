/**
 * Update Service
 * 自动更新服务 - 使用 electron-updater
 */

const { autoUpdater } = require('electron-updater');
const logger = require('../utils/logger');

class UpdateService {
  constructor() {
    this.mainWindow = null;
    this.updateAvailable = false;
    this.downloadProgress = 0;
  }

  /**
   * 初始化自动更新
   * @param {BrowserWindow} mainWindow - 主窗口引用
   */
  initialize(mainWindow) {
    this.mainWindow = mainWindow;

    // 配置更新服务器
    autoUpdater.setFeedURL({
      provider: 'generic',
      url: 'https://updates.example.com' // 替换为实际的更新服务器地址
    });

    // 配置更新选项
    autoUpdater.autoDownload = false; // 不自动下载，等待用户确认
    autoUpdater.autoInstallOnAppQuit = true; // 应用退出时自动安装

    // 注册事件监听
    this.registerUpdateEvents();

    // 启动时检查更新（延迟3秒，避免影响启动速度）
    setTimeout(() => {
      this.checkForUpdates();
    }, 3000);

    logger.info('Update service initialized');
  }

  /**
   * 注册更新事件
   */
  registerUpdateEvents() {
    // 检查更新错误
    autoUpdater.on('error', (error) => {
      logger.error('Update check failed:', error);
      this.sendToRenderer('update-error', {
        message: '检查更新失败',
        error: error.message
      });
    });

    // 检查更新中
    autoUpdater.on('checking-for-update', () => {
      logger.info('Checking for update...');
      this.sendToRenderer('checking-for-update');
    });

    // 发现新版本
    autoUpdater.on('update-available', (info) => {
      logger.info('Update available:', info);
      this.updateAvailable = true;
      this.sendToRenderer('update-available', {
        version: info.version,
        releaseDate: info.releaseDate,
        releaseNotes: info.releaseNotes
      });
    });

    // 当前已是最新版本
    autoUpdater.on('update-not-available', (info) => {
      logger.info('Update not available, current version:', info.version);
      this.sendToRenderer('update-not-available', {
        version: info.version
      });
    });

    // 下载进度
    autoUpdater.on('download-progress', (progressObj) => {
      this.downloadProgress = progressObj.percent;
      logger.info(`Download progress: ${progressObj.percent.toFixed(2)}%`);
      
      this.sendToRenderer('update-download-progress', {
        percent: progressObj.percent,
        transferred: progressObj.transferred,
        total: progressObj.total,
        bytesPerSecond: progressObj.bytesPerSecond
      });
    });

    // 下载完成
    autoUpdater.on('update-downloaded', (info) => {
      logger.info('Update downloaded:', info);
      this.sendToRenderer('update-downloaded', {
        version: info.version,
        releaseDate: info.releaseDate
      });
    });
  }

  /**
   * 检查更新
   */
  async checkForUpdates() {
    try {
      logger.info('Manually checking for updates...');
      const result = await autoUpdater.checkForUpdates();
      return result;
    } catch (error) {
      logger.error('Failed to check for updates:', error);
      return null;
    }
  }

  /**
   * 下载更新
   */
  downloadUpdate() {
    if (!this.updateAvailable) {
      logger.warn('No update available to download');
      return;
    }

    logger.info('Starting update download...');
    autoUpdater.downloadUpdate();
  }

  /**
   * 安装更新并重启
   */
  installUpdate() {
    logger.info('Installing update and restarting...');
    autoUpdater.quitAndInstall(false, true);
  }

  /**
   * 发送消息到渲染进程
   */
  sendToRenderer(channel, data) {
    if (this.mainWindow && this.mainWindow.webContents) {
      this.mainWindow.webContents.send(channel, data);
    }
  }

  /**
   * 获取当前版本
   */
  getCurrentVersion() {
    const { app } = require('electron');
    return app.getVersion();
  }

  /**
   * 获取更新状态
   */
  getUpdateStatus() {
    return {
      updateAvailable: this.updateAvailable,
      downloadProgress: this.downloadProgress,
      currentVersion: this.getCurrentVersion()
    };
  }
}

// 导出单例
const updateService = new UpdateService();

module.exports = updateService;













