/**
 * Preload Script
 * 预加载脚本 - 在渲染进程加载前运行，提供安全的 IPC 桥接
 */

const { contextBridge, ipcRenderer } = require('electron');

// 暴露安全的 API 到渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // ============ 系统信息 ============
  platform: process.platform,
  version: process.versions.electron,
  
  // ============ 视频抓取 ============
  /**
   * 抓取视频
   * @param {string} url - 视频链接
   * @returns {Promise<object>} 视频信息
   */
  fetchVideo: (url) => ipcRenderer.invoke('fetch-video', url),
  
  /**
   * 取消抓取
   * @param {string} taskId - 任务ID
   */
  cancelFetch: (taskId) => ipcRenderer.send('cancel-fetch', taskId),
  
  /**
   * 监听抓取进度
   * @param {function} callback - 回调函数
   */
  onFetchProgress: (callback) => {
    ipcRenderer.on('fetch-progress', (event, data) => callback(data));
  },
  
  /**
   * 移除进度监听
   */
  offFetchProgress: () => {
    ipcRenderer.removeAllListeners('fetch-progress');
  },

  // ============ 文件操作 ============
  /**
   * 选择文件
   * @param {object} options - 文件选择选项
   * @returns {Promise<string[]>} 文件路径列表
   */
  selectFile: (options) => ipcRenderer.invoke('select-file', options),
  
  /**
   * 选择保存路径
   * @param {object} options - 保存选项
   * @returns {Promise<string>} 保存路径
   */
  selectSavePath: (options) => ipcRenderer.invoke('select-save-path', options),
  
  /**
   * 保存文件
   * @param {string} path - 保存路径
   * @param {any} data - 文件数据
   */
  saveFile: (path, data) => ipcRenderer.invoke('save-file', path, data),
  
  /**
   * 打开文件夹
   * @param {string} path - 文件夹路径
   */
  openFolder: (path) => ipcRenderer.send('open-folder', path),

  // ============ 窗口控制 ============
  /**
   * 最小化窗口
   */
  minimizeWindow: () => ipcRenderer.send('minimize-window'),
  
  /**
   * 最大化/还原窗口
   */
  toggleMaximize: () => ipcRenderer.send('toggle-maximize'),
  
  /**
   * 关闭窗口
   */
  closeWindow: () => ipcRenderer.send('close-window'),
  
  /**
   * 监听窗口最大化状态
   */
  onWindowMaximized: (callback) => {
    ipcRenderer.on('window-maximized', (event, isMaximized) => callback(isMaximized));
  },

  // ============ 系统托盘 ============
  /**
   * 显示/隐藏窗口
   */
  toggleWindow: () => ipcRenderer.send('toggle-window'),

  // ============ 通知 ============
  /**
   * 显示系统通知
   * @param {object} options - 通知选项
   */
  showNotification: (options) => ipcRenderer.send('show-notification', options),

  // ============ 应用更新 ============
  /**
   * 检查更新
   */
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  
  /**
   * 下载更新
   */
  downloadUpdate: () => ipcRenderer.send('download-update'),
  
  /**
   * 安装更新
   */
  installUpdate: () => ipcRenderer.send('install-update'),
  
  /**
   * 监听更新事件
   */
  onUpdateAvailable: (callback) => {
    ipcRenderer.on('update-available', (event, info) => callback(info));
  },
  
  onUpdateDownloadProgress: (callback) => {
    ipcRenderer.on('update-download-progress', (event, progress) => callback(progress));
  },
  
  onUpdateDownloaded: (callback) => {
    ipcRenderer.on('update-downloaded', (event, info) => callback(info));
  },

  // ============ 配置管理 ============
  /**
   * 获取配置
   * @param {string} key - 配置键
   */
  getConfig: (key) => ipcRenderer.invoke('get-config', key),
  
  /**
   * 设置配置
   * @param {string} key - 配置键
   * @param {any} value - 配置值
   */
  setConfig: (key, value) => ipcRenderer.invoke('set-config', key, value),

  // ============ 日志 ============
  /**
   * 记录日志
   * @param {string} level - 日志级别
   * @param {string} message - 日志消息
   */
  log: (level, message) => ipcRenderer.send('log', level, message),

  // ============ 应用信息 ============
  /**
   * 获取应用信息
   */
  getAppInfo: () => ipcRenderer.invoke('get-app-info'),
  
  /**
   * 获取系统信息
   */
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),

  // ============ 其他工具 ============
  /**
   * 打开外部链接
   * @param {string} url - 链接地址
   */
  openExternal: (url) => ipcRenderer.send('open-external', url),
  
  /**
   * 复制到剪贴板
   * @param {string} text - 文本内容
   */
  copyToClipboard: (text) => ipcRenderer.invoke('copy-to-clipboard', text),
  
  /**
   * 从剪贴板读取
   */
  readFromClipboard: () => ipcRenderer.invoke('read-from-clipboard')
});

// 日志输出（仅开发模式）
if (process.env.NODE_ENV === 'development') {
  console.log('Preload script loaded successfully');
  console.log('Platform:', process.platform);
  console.log('Electron version:', process.versions.electron);
}






