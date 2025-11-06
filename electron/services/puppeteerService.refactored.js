/**
 * Puppeteer Service (Refactored)
 * Puppeteer 爬虫服务 - 负责视频抓取
 * 
 * 重构内容：
 * 1. 提取公共的页面初始化和视频处理逻辑
 * 2. 简化平台特定的抓取方法
 * 3. 优化日志记录和错误处理
 * 4. 移除冗余代码
 */

const puppeteer = require('puppeteer');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const config = require('../utils/config');

// 常量配置
const CONSTANTS = {
  USER_AGENT: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  MAX_RETRIES: 3,
  MAX_FILE_SIZE: 800 * 1024 * 1024, // 800MB
  LARGE_FILE_SIZE: 300 * 1024 * 1024, // 300MB
  TEMP_DIR: './temp',
  TIMEOUT: {
    PAGE_LOAD: 30000,
    DOWNLOAD: 300000,
    UPLOAD: 600000
  }
};

class PuppeteerService {
  constructor() {
    this.browser = null;
    this.isInitialized = false;
    this.fetchTasks = new Map();
    this.videoCache = new Map();
  }

  /**
   * 初始化 Puppeteer
   */
  async initialize() {
    if (this.isInitialized) {
      logger.info('Puppeteer already initialized');
      return;
    }

    logger.info('Launching Puppeteer browser...');
    this.browser = await puppeteer.launch({
      headless: false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920,1080'
      ],
      defaultViewport: { width: 1920, height: 1080 }
    });

    this.isInitialized = true;
    logger.info('Puppeteer browser launched successfully');

    this.browser.on('disconnected', () => {
      logger.warn('Browser disconnected');
      this.isInitialized = false;
      this.browser = null;
    });
  }

  /**
   * 抓取视频 - 主入口
   */
  async fetchVideo(url, progressCallback) {
    const taskId = this.generateTaskId();
    
    // 检查缓存
    if (this.isCacheValid(url)) {
      logger.info('Using cached video:', url);
      return this.videoCache.get(url).data;
    }

    // 重试逻辑
    for (let attempt = 1; attempt <= CONSTANTS.MAX_RETRIES; attempt++) {
      try {
        logger.info(`尝试 ${attempt}/${CONSTANTS.MAX_RETRIES}`);
        this._reportProgress(progressCallback, taskId, 'detecting', `检测平台 (${attempt}/${CONSTANTS.MAX_RETRIES})`);

        const result = await this._fetchVideoAttempt(url, taskId, progressCallback);
        this.cacheVideo(url, result);
        logger.info(`抓取成功 (尝试 ${attempt})`);
        return result;
        
      } catch (error) {
        logger.error(`尝试 ${attempt} 失败:`, error.message);
        
        if (attempt >= CONSTANTS.MAX_RETRIES) {
          throw new Error(`视频抓取失败（已重试 ${CONSTANTS.MAX_RETRIES} 次）: ${error.message}`);
        }
        
        const delayMs = attempt * 2000;
        logger.info(`等待 ${delayMs/1000} 秒后重试...`);
        this._reportProgress(progressCallback, taskId, 'retrying', `等待重试 ${delayMs/1000}秒...`);
        await this._delay(delayMs);
      }
    }
  }

  /**
   * 单次抓取尝试
   * @private
   */
  async _fetchVideoAttempt(url, taskId, progressCallback) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const page = await this.browser.newPage();
    this.fetchTasks.set(taskId, { page, url, status: 'running' });

    try {
      const platform = this.detectPlatform(url);
      logger.info('Platform:', platform);

      const result = await this._fetchByPlatform(page, url, platform, taskId, progressCallback);
      return result;
      
    } finally {
      await this._closePage(page);
      this.fetchTasks.delete(taskId);
    }
  }

  /**
   * 根据平台抓取视频
   * @private
   */
  async _fetchByPlatform(page, url, platform, taskId, progressCallback) {
    const platformHandlers = {
      'douyin': () => this._fetchDouyin(page, url, taskId, progressCallback),
      'bilibili': () => this._fetchBilibili(page, url, taskId, progressCallback),
      'kuaishou': () => this._fetchKuaishou(page, url, taskId, progressCallback)
    };

    const handler = platformHandlers[platform];
    if (!handler) {
      throw new Error('Unsupported platform: ' + platform);
    }

    return await handler();
  }

  /**
   * 抓取抖音视频
   * @private
   */
  async _fetchDouyin(page, url, taskId, progressCallback) {
    logger.info('Fetching Douyin video');
    
    await this._initializePage(page);
    this._reportProgress(progressCallback, taskId, 'loading', '访问页面...');

    // 访问首页获取cookie
    try {
      await page.goto('https://www.douyin.com', { 
        waitUntil: 'networkidle2',
        timeout: CONSTANTS.TIMEOUT.PAGE_LOAD 
      });
      await this._delay(2000);
      logger.info(`获取到 ${(await page.cookies()).length} 个 cookies`);
    } catch (e) {
      logger.warn('访问首页失败:', e.message);
    }

    // 访问目标页面
    await page.goto(url, { 
      waitUntil: 'networkidle2',
      timeout: CONSTANTS.TIMEOUT.PAGE_LOAD 
    });
    await this._delay(3000);

    this._reportProgress(progressCallback, taskId, 'extracting', '解析视频...');

    // 提取视频信息
    const videoInfo = await this._extractDouyinVideo(page);
    if (!videoInfo?.videoUrl) {
      throw new Error(videoInfo?.error || '视频URL提取失败');
    }

    logger.info('视频信息提取成功, sources:', videoInfo.sourceCount);

    // 下载和上传
    return await this._processVideo(videoInfo, taskId, progressCallback, 'douyin');
  }

  /**
   * 提取抖音视频信息
   * @private
   */
  async _extractDouyinVideo(page) {
    return await page.evaluate(() => {
      const videoElement = document.querySelector('video');
      
      if (!videoElement) {
        return { videoUrl: null, error: 'Video element not found' };
      }

      const sources = videoElement.querySelectorAll('source');
      
      // 优先使用最后一个source标签
      if (sources.length > 0) {
        const lastSource = sources[sources.length - 1];
        const videoUrl = lastSource?.src;

        if (videoUrl && !videoUrl.startsWith('blob:')) {
          return {
            videoUrl,
            title: document.querySelector('title')?.textContent || '',
            author: document.querySelector('.author-name, .account-name')?.textContent || '',
            sourceCount: sources.length,
            extractMethod: 'source_tag'
          };
        }
      }

      // 回退到video.src
      if (videoElement.src && !videoElement.src.startsWith('blob:')) {
        return {
          videoUrl: videoElement.src,
          title: document.querySelector('title')?.textContent || '',
          author: document.querySelector('.author-name, .account-name')?.textContent || '',
          sourceCount: 0,
          extractMethod: 'video_src'
        };
      }

      return { 
        videoUrl: null, 
        error: `No valid video URL (sources: ${sources.length})`
      };
    });
  }

  /**
   * 抓取B站视频
   * @private
   */
  async _fetchBilibili(page, url, taskId, progressCallback) {
    logger.info('Fetching Bilibili video');
    
    await this._initializePage(page);
    this._reportProgress(progressCallback, taskId, 'loading', '访问页面...');

    await page.goto(url, { 
      waitUntil: 'networkidle2',
      timeout: CONSTANTS.TIMEOUT.PAGE_LOAD 
    });

    this._reportProgress(progressCallback, taskId, 'extracting', '解析视频...');

    const videoInfo = await page.evaluate(() => ({
      videoUrl: document.querySelector('video')?.src || '',
      title: document.querySelector('h1.video-title')?.textContent || '',
      author: document.querySelector('.up-name')?.textContent || '',
      poster: document.querySelector('.bili-video-card__cover')?.src || ''
    }));

    if (!videoInfo.videoUrl) {
      throw new Error('视频URL提取失败');
    }

    return await this._processVideo(videoInfo, taskId, progressCallback, 'bilibili');
  }

  /**
   * 抓取快手视频
   * @private
   */
  async _fetchKuaishou(page, url, taskId, progressCallback) {
    logger.info('Fetching Kuaishou video');
    
    await this._initializePage(page);
    this._reportProgress(progressCallback, taskId, 'loading', '访问页面...');

    await page.goto(url, { 
      waitUntil: 'networkidle2',
      timeout: CONSTANTS.TIMEOUT.PAGE_LOAD 
    });

    const videoInfo = await page.evaluate(() => ({
      videoUrl: document.querySelector('video')?.src || '',
      title: document.querySelector('.video-info-title')?.textContent || '',
      poster: document.querySelector('video')?.poster || ''
    }));

    if (!videoInfo.videoUrl) {
      throw new Error('视频URL提取失败');
    }

    return await this._processVideo(videoInfo, taskId, progressCallback, 'kuaishou');
  }

  /**
   * 处理视频：下载 + 上传 + 构建结果
   * @private
   */
  async _processVideo(videoInfo, taskId, progressCallback, platform) {
    // 下载
    this._reportProgress(progressCallback, taskId, 'downloading', '下载视频...');
    const tempFilePath = await this._downloadVideo(videoInfo.videoUrl, taskId);
    
    // 上传
    this._reportProgress(progressCallback, taskId, 'uploading', '上传视频...');
    const uploadResult = await this._uploadToBackend(tempFilePath, videoInfo, platform);
    
    // 构建结果
    return this._buildResult(videoInfo, uploadResult, platform);
  }

  /**
   * 构建最终结果
   * @private
   */
  _buildResult(videoInfo, uploadResult, platform) {
    const ossVideoUrl = uploadResult.cdnUrl || uploadResult.videoUrl;
    const thumbnailUrl = platform === 'douyin' 
      ? this._generateOssThumbnail(ossVideoUrl)
      : uploadResult.thumbnailUrl;

    return {
      title: videoInfo.title,
      author: videoInfo.author,
      platform,
      videoUrl: ossVideoUrl,
      cdnUrl: ossVideoUrl,
      thumbnailUrl,
      videoId: uploadResult.videoId,
      sourceCount: videoInfo.sourceCount || 0
    };
  }

  /**
   * 生成OSS缩略图URL
   * @private
   */
  _generateOssThumbnail(videoUrl) {
    if (!videoUrl) return '';
    return `${videoUrl}?x-oss-process=video/snapshot,t_1000,f_jpg,w_0,h_0,m_fast`;
  }

  /**
   * 下载视频到临时文件
   * @private
   */
  async _downloadVideo(videoUrl, taskId) {
    logger.info('Downloading video...');

    this._ensureTempDir();
    const tempFilePath = path.join(CONSTANTS.TEMP_DIR, `video_${taskId}.mp4`);

    try {
      const response = await axios({
        method: 'GET',
        url: videoUrl,
        responseType: 'stream',
        timeout: CONSTANTS.TIMEOUT.DOWNLOAD,
        maxContentLength: CONSTANTS.MAX_FILE_SIZE,
      });

      const totalSize = parseInt(response.headers['content-length'] || '0');
      this._validateFileSize(totalSize);

      const writer = fs.createWriteStream(tempFilePath);
      response.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
        response.data.on('error', reject);
      });

      logger.info(`Downloaded: ${(totalSize / 1024 / 1024).toFixed(2)}MB`);
      return tempFilePath;
      
    } catch (error) {
      this._cleanupFile(tempFilePath);
      throw new Error('视频下载失败: ' + error.message);
    }
  }

  /**
   * 上传视频到后端
   * @private
   */
  async _uploadToBackend(tempFilePath, videoInfo, platform) {
    logger.info('Uploading video to backend...');

    try {
      const uploadUrl = this._getUploadUrl();
      const stats = fs.statSync(tempFilePath);
      
      logger.info(`Upload size: ${(stats.size / 1024 / 1024).toFixed(2)}MB`);

      const formData = new FormData();
      formData.append('file', fs.createReadStream(tempFilePath), {
        filename: 'video.mp4',
        contentType: 'video/mp4',
        knownLength: stats.size
      });
      formData.append('title', videoInfo.title || '');
      formData.append('author', videoInfo.author || '');
      formData.append('platform', platform);

      const authInfo = config.getAuthInfo();
      const response = await axios.post(uploadUrl, formData, {
        headers: {
          ...formData.getHeaders(),
          'Authorization': authInfo.token ? `Bearer ${authInfo.token}` : ''
        },
        timeout: CONSTANTS.TIMEOUT.UPLOAD,
        maxBodyLength: Infinity,
        maxContentLength: Infinity
      });

      const backendData = response.data.data || response.data;
      logger.info('Upload successful');
      
      this._cleanupFile(tempFilePath);
      
      return {
        videoId: backendData.videoId,
        videoUrl: backendData.videoUrl,
        cdnUrl: backendData.cdnUrl,
        thumbnailUrl: backendData.thumbnailUrl,
        title: backendData.title,
        size: backendData.size,
        duration: backendData.duration,
        platform: backendData.platform
      };
      
    } catch (error) {
      this._cleanupFile(tempFilePath);
      logger.error('Upload failed:', error.message);
      throw new Error('视频上传失败: ' + error.message);
    }
  }

  /**
   * 辅助方法：初始化页面
   * @private
   */
  async _initializePage(page) {
    await page.setUserAgent(CONSTANTS.USER_AGENT);
  }

  /**
   * 辅助方法：报告进度
   * @private
   */
  _reportProgress(progressCallback, taskId, step, message) {
    progressCallback && progressCallback({ taskId, step, message });
  }

  /**
   * 辅助方法：延迟
   * @private
   */
  async _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 辅助方法：关闭页面
   * @private
   */
  async _closePage(page) {
    try {
      if (page && !page.isClosed()) {
        await page.close();
      }
    } catch (e) {
      logger.warn('Failed to close page:', e.message);
    }
  }

  /**
   * 辅助方法：确保临时目录存在
   * @private
   */
  _ensureTempDir() {
    if (!fs.existsSync(CONSTANTS.TEMP_DIR)) {
      fs.mkdirSync(CONSTANTS.TEMP_DIR, { recursive: true });
    }
  }

  /**
   * 辅助方法：验证文件大小
   * @private
   */
  _validateFileSize(size) {
    const sizeMB = size / 1024 / 1024;
    
    if (size > CONSTANTS.MAX_FILE_SIZE) {
      throw new Error(`视频过大（${sizeMB.toFixed(0)}MB），超过800MB限制`);
    }
    
    if (size > CONSTANTS.LARGE_FILE_SIZE) {
      logger.warn(`视频较大: ${sizeMB.toFixed(2)}MB`);
    }
  }

  /**
   * 辅助方法：清理临时文件
   * @private
   */
  _cleanupFile(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        logger.info('Temp file deleted');
      }
    } catch (e) {
      logger.warn('Failed to delete temp file:', e.message);
    }
  }

  /**
   * 辅助方法：获取上传URL
   * @private
   */
  _getUploadUrl() {
    const apiConfig = config.getApiConfig();
    let baseUrl = apiConfig.baseUrl || 'http://localhost:8080';
    
    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      baseUrl = 'http://' + baseUrl;
    }
    
    baseUrl = baseUrl.replace(/\/$/, '');
    return `${baseUrl}/api/video/upload`;
  }

  /**
   * 检测视频平台
   */
  detectPlatform(url) {
    if (url.includes('douyin.com') || url.includes('iesdouyin.com')) {
      return 'douyin';
    } else if (url.includes('bilibili.com')) {
      return 'bilibili';
    } else if (url.includes('kuaishou.com') || url.includes('chenzhongtech.com')) {
      return 'kuaishou';
    }
    return 'unknown';
  }

  /**
   * 取消抓取任务
   */
  async cancelFetch(taskId) {
    const task = this.fetchTasks.get(taskId);
    if (task) {
      logger.info('Cancelling task:', taskId);
      task.status = 'cancelled';
      await this._closePage(task.page);
      this.fetchTasks.delete(taskId);
    }
  }

  /**
   * 缓存视频信息
   */
  cacheVideo(url, data) {
    const cacheExpireTime = config.get('puppeteer.cacheExpireTime', 300000);
    this.videoCache.set(url, {
      data,
      timestamp: Date.now(),
      expireTime: cacheExpireTime
    });
  }

  /**
   * 检查缓存是否有效
   */
  isCacheValid(url) {
    if (!config.get('puppeteer.enableCache', true)) return false;

    const cached = this.videoCache.get(url);
    if (!cached) return false;

    const isExpired = Date.now() - cached.timestamp > cached.expireTime;
    if (isExpired) {
      this.videoCache.delete(url);
      return false;
    }

    return true;
  }

  /**
   * 生成任务ID
   */
  generateTaskId() {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 清理资源
   */
  async cleanup() {
    logger.info('Cleaning up...');

    for (const [taskId] of this.fetchTasks) {
      await this.cancelFetch(taskId);
    }

    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }

    this.isInitialized = false;
    logger.info('Cleanup completed');
  }
}

// 导出单例
const puppeteerService = new PuppeteerService();
module.exports = puppeteerService;

