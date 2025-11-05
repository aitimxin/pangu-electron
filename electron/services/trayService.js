/**
 * Tray Service
 * 系统托盘服务
 */

const { Tray, Menu, nativeImage, app } = require('electron');
const path = require('path');
const logger = require('../utils/logger');
const config = require('../utils/config');

class TrayService {
  constructor() {
    this.tray = null;
    this.mainWindow = null;
  }

  /**
   * 创建系统托盘
   * @param {BrowserWindow} mainWindow - 主窗口引用
   */
  createTray(mainWindow) {
    this.mainWindow = mainWindow;

    try {
      // 创建托盘图标
      const iconPath = this.getTrayIcon();
      const trayIcon = nativeImage.createFromPath(iconPath);
      
      this.tray = new Tray(trayIcon);
      
      // 设置托盘提示
      this.tray.setToolTip('Pangu AI Agent');
      
      // 设置托盘菜单
      this.updateContextMenu();
      
      // 点击托盘图标显示/隐藏窗口
      this.tray.on('click', () => {
        this.toggleWindow();
      });

      // 双击托盘图标显示窗口
      this.tray.on('double-click', () => {
        if (this.mainWindow) {
          this.mainWindow.show();
          this.mainWindow.focus();
        }
      });

      logger.info('System tray created successfully');
    } catch (error) {
      logger.error('Failed to create system tray:', error);
    }
  }

  /**
   * 更新托盘菜单
   */
  updateContextMenu() {
    const contextMenu = Menu.buildFromTemplate([
      {
        label: '显示窗口',
        click: () => {
          if (this.mainWindow) {
            this.mainWindow.show();
            this.mainWindow.focus();
          }
        }
      },
      {
        label: '隐藏窗口',
        click: () => {
          if (this.mainWindow) {
            this.mainWindow.hide();
          }
        }
      },
      { type: 'separator' },
      {
        label: '新建对话',
        accelerator: 'CommandOrControl+N',
        click: () => {
          if (this.mainWindow) {
            this.mainWindow.show();
            this.mainWindow.focus();
            this.mainWindow.webContents.send('new-conversation');
          }
        }
      },
      { type: 'separator' },
      {
        label: '设置',
        click: () => {
          if (this.mainWindow) {
            this.mainWindow.show();
            this.mainWindow.focus();
            this.mainWindow.webContents.send('open-settings');
          }
        }
      },
      {
        label: '关于',
        click: () => {
          if (this.mainWindow) {
            this.mainWindow.show();
            this.mainWindow.focus();
            this.mainWindow.webContents.send('open-about');
          }
        }
      },
      { type: 'separator' },
      {
        label: '退出',
        click: () => {
          app.isQuitting = true;
          app.quit();
        }
      }
    ]);

    if (this.tray) {
      this.tray.setContextMenu(contextMenu);
    }
  }

  /**
   * 切换窗口显示/隐藏
   */
  toggleWindow() {
    if (this.mainWindow) {
      if (this.mainWindow.isVisible()) {
        this.mainWindow.hide();
      } else {
        this.mainWindow.show();
        this.mainWindow.focus();
      }
    }
  }

  /**
   * 显示通知
   * @param {string} title - 通知标题
   * @param {string} body - 通知内容
   */
  showNotification(title, body) {
    if (this.tray) {
      this.tray.displayBalloon({
        title,
        content: body,
        icon: this.getTrayIcon()
      });
    }
  }

  /**
   * 更新托盘图标
   * @param {string} iconPath - 图标路径
   */
  updateIcon(iconPath) {
    if (this.tray) {
      const icon = nativeImage.createFromPath(iconPath);
      this.tray.setImage(icon);
    }
  }

  /**
   * 更新托盘提示文字
   * @param {string} tooltip - 提示文字
   */
  updateTooltip(tooltip) {
    if (this.tray) {
      this.tray.setToolTip(tooltip);
    }
  }

  /**
   * 获取托盘图标路径
   */
  getTrayIcon() {
    const iconName = process.platform === 'win32' ? 'icon.ico' : 'icon.png';
    return path.join(__dirname, '../../build', iconName);
  }

  /**
   * 销毁托盘
   */
  destroy() {
    if (this.tray) {
      this.tray.destroy();
      this.tray = null;
      logger.info('System tray destroyed');
    }
  }
}

// 导出单例
const trayService = new TrayService();

module.exports = trayService;

