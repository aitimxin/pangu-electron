/**
 * Puppeteer Service
 * Puppeteer 爬虫服务 - 负责视频抓取
 */

const puppeteer = require('puppeteer');
const axios = require('axios');
const FormData = require('form-data');
const logger = require('../utils/logger');
const config = require('../utils/config');

class PuppeteerService {
  constructor() {
    this.browser = null;
    this.isInitialized = false;
    this.fetchTasks = new Map(); // 任务管理
    this.videoCache = new Map(); // 视频缓存
  }

  /**
   * 初始化 Puppeteer
   */
  async initialize() {
    if (this.isInitialized) {
      logger.info('Puppeteer already initialized');
      return;
    }

    try {
      logger.info('Launching Puppeteer browser...');
      const puppeteerConfig = config.getPuppeteerConfig();
      
      this.browser = await puppeteer.launch({
        headless: puppeteerConfig.headless !== false,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          '--window-size=1920,1080'
        ],
        defaultViewport: {
          width: 1920,
          height: 1080
        }
      });

      this.isInitialized = true;
      logger.info('Puppeteer browser launched successfully');
      
      // 监听浏览器断开
      this.browser.on('disconnected', () => {
        logger.warn('Puppeteer browser disconnected');
        this.isInitialized = false;
        this.browser = null;
      });
    } catch (error) {
      logger.error('Failed to launch Puppeteer:', error);
      throw error;
    }
  }

  /**
   * 抓取视频
   * @param {string} url - 视频链接
   * @param {function} progressCallback - 进度回调
   * @returns {Promise<object>} 视频信息
   */
  async fetchVideo(url, progressCallback) {
    const taskId = this.generateTaskId();
    
    try {
      // 检查缓存
      if (this.isCacheValid(url)) {
        logger.info('Using cached video:', url);
        return this.videoCache.get(url).data;
      }

      // 检测平台
      const platform = this.detectPlatform(url);
      logger.info('Detected platform:', platform);
      
      progressCallback && progressCallback({ 
        taskId, 
        step: 'detecting', 
        message: '检测视频平台...' 
      });

      // 确保浏览器已初始化
      if (!this.isInitialized) {
        await this.initialize();
      }

      // 创建新页面
      const page = await this.browser.newPage();
      this.fetchTasks.set(taskId, { page, url, status: 'running' });

      // 根据平台抓取
      let result;
      switch (platform) {
        case 'douyin':
          result = await this.fetchDouyin(page, url, taskId, progressCallback);
          break;
        case 'bilibili':
          result = await this.fetchBilibili(page, url, taskId, progressCallback);
          break;
        case 'kuaishou':
          result = await this.fetchKuaishou(page, url, taskId, progressCallback);
          break;
        default:
          throw new Error('Unsupported platform: ' + platform);
      }

      // 关闭页面
      await page.close();
      this.fetchTasks.delete(taskId);

      // 缓存结果
      this.cacheVideo(url, result);

      return result;
    } catch (error) {
      logger.error('Failed to fetch video:', error);
      
      // 清理任务
      const task = this.fetchTasks.get(taskId);
      if (task && task.page) {
        await task.page.close();
      }
      this.fetchTasks.delete(taskId);

      throw error;
    }
  }

  /**
   * 抓取抖音视频
   */
  async fetchDouyin(page, url, taskId, progressCallback) {
    logger.info('Fetching Douyin video:', url);
    
    progressCallback && progressCallback({ 
      taskId, 
      step: 'loading', 
      message: '正在访问抖音页面...' 
    });

    // 设置 User-Agent
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    // 访问页面
    await page.goto(url, { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });

    progressCallback && progressCallback({ 
      taskId, 
      step: 'extracting', 
      message: '正在提取视频信息...' 
    });

    // 提取视频信息
    const videoInfo = await page.evaluate(() => {
      // 方法1: 从 video 标签提取
      const videoElement = document.querySelector('video');
      if (videoElement && videoElement.src) {
        return {
          videoUrl: videoElement.src,
          title: document.querySelector('title')?.textContent || '',
          poster: videoElement.poster || ''
        };
      }

      // 方法2: 从页面数据提取
      const scripts = document.querySelectorAll('script');
      for (const script of scripts) {
        const text = script.textContent;
        if (text.includes('videoData') || text.includes('playAddr')) {
          try {
            // 尝试解析 JSON 数据
            const match = text.match(/videoData["\s:]+({.+?})/);
            if (match) {
              const data = JSON.parse(match[1]);
              return {
                videoUrl: data.playAddr || data.video?.playAddr,
                title: data.desc || data.title,
                author: data.author?.nickname,
                poster: data.cover || data.video?.cover
              };
            }
          } catch (e) {
            // 继续尝试其他方法
          }
        }
      }

      return null;
    });

    if (!videoInfo || !videoInfo.videoUrl) {
      throw new Error('Failed to extract video URL from Douyin');
    }

    logger.info('Douyin video info extracted:', videoInfo);

    // 下载视频
    progressCallback && progressCallback({ 
      taskId, 
      step: 'downloading', 
      message: '正在下载视频...' 
    });

    const videoBuffer = await this.downloadVideo(videoInfo.videoUrl, progressCallback, taskId);

    // 上传到后端
    progressCallback && progressCallback({ 
      taskId, 
      step: 'uploading', 
      message: '正在上传视频...' 
    });

    const uploadResult = await this.uploadToBackend(videoBuffer, videoInfo, progressCallback, taskId);

    return {
      ...videoInfo,
      ...uploadResult,
      platform: 'douyin'
    };
  }

  /**
   * 抓取 B 站视频
   */
  async fetchBilibili(page, url, taskId, progressCallback) {
    logger.info('Fetching Bilibili video:', url);
    
    progressCallback && progressCallback({ 
      taskId, 
      step: 'loading', 
      message: '正在访问 B 站页面...' 
    });

    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    await page.goto(url, { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });

    progressCallback && progressCallback({ 
      taskId, 
      step: 'extracting', 
      message: '正在提取视频信息...' 
    });

    // B 站视频提取逻辑（简化示例）
    const videoInfo = await page.evaluate(() => {
      const videoElement = document.querySelector('video');
      return {
        videoUrl: videoElement?.src || '',
        title: document.querySelector('h1.video-title')?.textContent || '',
        author: document.querySelector('.up-name')?.textContent || '',
        poster: document.querySelector('.bili-video-card__cover')?.src || ''
      };
    });

    if (!videoInfo.videoUrl) {
      throw new Error('Failed to extract video URL from Bilibili');
    }

    const videoBuffer = await this.downloadVideo(videoInfo.videoUrl, progressCallback, taskId);
    const uploadResult = await this.uploadToBackend(videoBuffer, videoInfo, progressCallback, taskId);

    return {
      ...videoInfo,
      ...uploadResult,
      platform: 'bilibili'
    };
  }

  /**
   * 抓取快手视频
   */
  async fetchKuaishou(page, url, taskId, progressCallback) {
    logger.info('Fetching Kuaishou video:', url);
    
    // 类似抖音的实现
    progressCallback && progressCallback({ 
      taskId, 
      step: 'loading', 
      message: '正在访问快手页面...' 
    });

    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    await page.goto(url, { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });

    // 快手视频提取逻辑（简化示例）
    const videoInfo = await page.evaluate(() => {
      const videoElement = document.querySelector('video');
      return {
        videoUrl: videoElement?.src || '',
        title: document.querySelector('.video-info-title')?.textContent || '',
        poster: videoElement?.poster || ''
      };
    });

    if (!videoInfo.videoUrl) {
      throw new Error('Failed to extract video URL from Kuaishou');
    }

    const videoBuffer = await this.downloadVideo(videoInfo.videoUrl, progressCallback, taskId);
    const uploadResult = await this.uploadToBackend(videoBuffer, videoInfo, progressCallback, taskId);

    return {
      ...videoInfo,
      ...uploadResult,
      platform: 'kuaishou'
    };
  }

  /**
   * 下载视频到内存
   */
  async downloadVideo(videoUrl, progressCallback, taskId) {
    logger.info('Downloading video:', videoUrl);

    try {
      const response = await axios.get(videoUrl, {
        responseType: 'arraybuffer',
        timeout: 120000, // 2分钟超时
        onDownloadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          progressCallback && progressCallback({
            taskId,
            step: 'downloading',
            message: `下载中... ${percentCompleted}%`,
            progress: percentCompleted
          });
        }
      });

      logger.info('Video downloaded, size:', response.data.byteLength);
      return Buffer.from(response.data);
    } catch (error) {
      logger.error('Failed to download video:', error);
      throw new Error('视频下载失败: ' + error.message);
    }
  }

  /**
   * 上传视频到后端
   */
  async uploadToBackend(videoBuffer, videoInfo, progressCallback, taskId) {
    logger.info('Uploading video to backend...');

    try {
      const apiConfig = config.getApiConfig();
      const authInfo = config.getAuthInfo();

      const formData = new FormData();
      formData.append('file', videoBuffer, {
        filename: 'video.mp4',
        contentType: 'video/mp4'
      });
      formData.append('title', videoInfo.title || '');
      formData.append('author', videoInfo.author || '');
      formData.append('platform', videoInfo.platform || '');

      const response = await axios.post(
        `${apiConfig.baseUrl}/api/v1/videos/upload`,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            'Authorization': `Bearer ${authInfo.token}`
          },
          timeout: 180000, // 3分钟超时
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            progressCallback && progressCallback({
              taskId,
              step: 'uploading',
              message: `上传中... ${percentCompleted}%`,
              progress: percentCompleted
            });
          }
        }
      );

      logger.info('Video uploaded successfully:', response.data);
      
      return {
        videoId: response.data.id,
        cdnUrl: response.data.cdnUrl,
        thumbnailUrl: response.data.thumbnailUrl
      };
    } catch (error) {
      logger.error('Failed to upload video:', error);
      throw new Error('视频上传失败: ' + error.message);
    }
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
    } else {
      return 'unknown';
    }
  }

  /**
   * 取消抓取任务
   */
  async cancelFetch(taskId) {
    const task = this.fetchTasks.get(taskId);
    if (task) {
      logger.info('Cancelling fetch task:', taskId);
      task.status = 'cancelled';
      if (task.page) {
        await task.page.close();
      }
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
    const enableCache = config.get('puppeteer.enableCache', true);
    if (!enableCache) return false;

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
   * 生成任务 ID
   */
  generateTaskId() {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 清理资源
   */
  async cleanup() {
    logger.info('Cleaning up Puppeteer service...');

    // 取消所有进行中的任务
    for (const [taskId, task] of this.fetchTasks) {
      await this.cancelFetch(taskId);
    }

    // 关闭浏览器
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }

    this.isInitialized = false;
    logger.info('Puppeteer service cleaned up');
  }
}

// 导出单例
const puppeteerService = new PuppeteerService();

module.exports = puppeteerService;

