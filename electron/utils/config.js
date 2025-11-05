/**
 * Configuration Manager
 * 配置管理 - 使用 electron-store 进行持久化配置
 */

const Store = require('electron-store');
const path = require('path');

// 配置 Schema
const schema = {
  // 应用配置
  app: {
    type: 'object',
    properties: {
      firstRun: { type: 'boolean', default: true },
      autoStart: { type: 'boolean', default: false },
      minimizeToTray: { type: 'boolean', default: true },
      startMinimized: { type: 'boolean', default: false },
      language: { type: 'string', default: 'zh-CN' },
      theme: { type: 'string', default: 'auto' } // 'light', 'dark', 'auto'
    }
  },

  // 窗口配置
  window: {
    type: 'object',
    properties: {
      width: { type: 'number', default: 1200 },
      height: { type: 'number', default: 800 },
      x: { type: 'number', default: null },
      y: { type: 'number', default: null }
    }
  },

  // API 配置
  api: {
    type: 'object',
    properties: {
      baseUrl: { type: 'string', default: 'https://api.example.com' },
      timeout: { type: 'number', default: 30000 },
      retryTimes: { type: 'number', default: 3 }
    }
  },

  // 前端配置
  frontend: {
    type: 'object',
    properties: {
      devUrl: { type: 'string', default: 'http://localhost:8000' },
      prodPath: { type: 'string', default: '../app/index.html' }
    }
  },

  // Puppeteer 配置
  puppeteer: {
    type: 'object',
    properties: {
      headless: { type: 'boolean', default: true },
      timeout: { type: 'number', default: 30000 },
      maxRetries: { type: 'number', default: 3 },
      userAgent: { type: 'string', default: '' },
      enableCache: { type: 'boolean', default: true },
      cacheExpireTime: { type: 'number', default: 300000 } // 5分钟
    }
  },

  // 用户认证
  auth: {
    type: 'object',
    properties: {
      token: { type: 'string', default: '' },
      refreshToken: { type: 'string', default: '' },
      userId: { type: 'string', default: '' },
      username: { type: 'string', default: '' }
    }
  },

  // 快捷键配置
  shortcuts: {
    type: 'object',
    properties: {
      toggleWindow: { type: 'string', default: 'CommandOrControl+Shift+P' },
      newConversation: { type: 'string', default: 'CommandOrControl+N' }
    }
  }
};

class ConfigManager {
  constructor() {
    this.store = new Store({ schema });
  }

  /**
   * 获取配置值
   * @param {string} key - 配置键（支持点号分隔）
   * @param {*} defaultValue - 默认值
   * @returns {*} 配置值
   */
  get(key, defaultValue = null) {
    return this.store.get(key, defaultValue);
  }

  /**
   * 设置配置值
   * @param {string|object} key - 配置键或配置对象
   * @param {*} value - 配置值
   */
  set(key, value = null) {
    if (typeof key === 'object') {
      // 批量设置
      Object.keys(key).forEach(k => {
        this.store.set(k, key[k]);
      });
    } else {
      this.store.set(key, value);
    }
  }

  /**
   * 删除配置项
   * @param {string} key - 配置键
   */
  delete(key) {
    this.store.delete(key);
  }

  /**
   * 清空所有配置
   */
  clear() {
    this.store.clear();
  }

  /**
   * 重置为默认配置
   */
  reset() {
    this.store.clear();
  }

  /**
   * 检查配置是否存在
   * @param {string} key - 配置键
   * @returns {boolean}
   */
  has(key) {
    return this.store.has(key);
  }

  /**
   * 获取应用配置
   */
  getAppConfig() {
    return this.get('app', {});
  }

  /**
   * 获取窗口配置
   */
  getWindowConfig() {
    return this.get('window', {});
  }

  /**
   * 保存窗口状态
   * @param {object} bounds - 窗口边界
   */
  saveWindowState(bounds) {
    this.set('window', bounds);
  }

  /**
   * 获取 API 配置
   */
  getApiConfig() {
    return this.get('api', {});
  }

  /**
   * 获取前端 URL
   */
  getFrontendUrl() {
    const isDev = process.env.NODE_ENV === 'development';
    if (isDev) {
      return this.get('frontend.devUrl');
    } else {
      return path.join(__dirname, '../../resources/app/index.html');
    }
  }

  /**
   * 获取 Puppeteer 配置
   */
  getPuppeteerConfig() {
    return this.get('puppeteer', {});
  }

  /**
   * 获取认证信息
   */
  getAuthInfo() {
    return this.get('auth', {});
  }

  /**
   * 保存认证信息
   * @param {object} authInfo - 认证信息
   */
  saveAuthInfo(authInfo) {
    this.set('auth', authInfo);
  }

  /**
   * 清除认证信息
   */
  clearAuthInfo() {
    this.set('auth', {
      token: '',
      refreshToken: '',
      userId: '',
      username: ''
    });
  }

  /**
   * 检查是否已登录
   */
  isLoggedIn() {
    const token = this.get('auth.token');
    return !!token;
  }

  /**
   * 获取快捷键配置
   */
  getShortcuts() {
    return this.get('shortcuts', {});
  }

  /**
   * 导出所有配置
   */
  export() {
    return this.store.store;
  }

  /**
   * 导入配置
   * @param {object} config - 配置对象
   */
  import(config) {
    this.store.store = config;
  }
}

// 导出单例
const config = new ConfigManager();

module.exports = config;

