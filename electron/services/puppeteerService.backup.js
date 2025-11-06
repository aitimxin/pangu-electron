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
        headless: false,  // 关闭无头模式，显示浏览器窗口
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
    const maxRetries = 3; // 最多重试3次
    
    // 检查缓存
    if (this.isCacheValid(url)) {
      logger.info('Using cached video:', url);
      return this.videoCache.get(url).data;
    }

    // 检测平台
    const platform = this.detectPlatform(url);
    logger.info('Detected platform:', platform);
    
    // 重试逻辑
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      let page = null;
      
      try {
        logger.info(`========== 第 ${attempt} 次尝试抓取视频 ==========`);
        
        progressCallback && progressCallback({ 
          taskId, 
          step: 'detecting', 
          message: `🔍 检测平台 (${attempt}/${maxRetries})` 
        });

        // 确保浏览器已初始化
        if (!this.isInitialized) {
          await this.initialize();
        }

        // 创建新页面
        page = await this.browser.newPage();
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

        logger.info(`========== 第 ${attempt} 次尝试成功 ==========`);
        return result;
        
      } catch (error) {
        logger.error(`第 ${attempt} 次尝试失败:`, error.message);
        
        // 清理任务
        if (page) {
          try {
            await page.close();
          } catch (e) {
            logger.warn('Failed to close page:', e.message);
          }
        }
        this.fetchTasks.delete(taskId);

        // 如果是最后一次尝试，抛出错误
        if (attempt >= maxRetries) {
          logger.error(`========== 已尝试 ${maxRetries} 次，全部失败 ==========`);
          throw new Error(`视频抓取失败（已重试 ${maxRetries} 次）: ${error.message}`);
        }
        
        // 等待一段时间后重试（递增延迟）
        const delayMs = attempt * 2000; // 2秒、4秒
        logger.info(`等待 ${delayMs/1000} 秒后重试...`);
        
        progressCallback && progressCallback({ 
          taskId, 
          step: 'retrying', 
          message: `⏱️ 等待重试 ${delayMs/1000}秒...` 
        });
        
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  /**
   * 抓取抖音视频
   */
  async fetchDouyin(page, url, taskId, progressCallback) {
    logger.info('Fetching Douyin video:', url);
    
    // 设置 User-Agent
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    // 步骤1: 先访问首页获取cookie
    progressCallback && progressCallback({ 
      taskId, 
      step: 'loading', 
      message: '📱 访问页面...' 
    });

    try {
      logger.info('Step 1: Visiting Douyin homepage to get cookies...');
      await page.goto('https://www.douyin.com', { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });
      
      // 等待一下，确保cookie设置完成
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const cookies = await page.cookies();
      logger.info(`Step 1 完成: 获取到 ${cookies.length} 个 cookies`);
      
    } catch (e) {
      logger.warn('访问首页失败，继续尝试:', e.message);
    }

    // 步骤2: 带着cookie访问目标视频页面

    logger.info('Step 2: Visiting target video page with cookies...');
    await page.goto(url, { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });

    // 等待页面完全加载
    logger.info('Waiting for page to fully load...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    progressCallback && progressCallback({ 
      taskId, 
      step: 'extracting', 
      message: '🎬 解析视频...' 
    });

    // 简化的视频提取：只从最后一个source标签获取
    logger.info('Extracting video URL from last <source> tag...');
    const videoInfo = await page.evaluate(() => {
      const videoElement = document.querySelector('video');
      
      if (!videoElement) {
        return { 
          videoUrl: null, 
          error: 'Video element not found'
        };
      }

      const sources = videoElement.querySelectorAll('source');
      
      // 如果有source子元素，使用最后一个
      if (sources.length > 0) {
        const lastSource = sources[sources.length - 1];
        const videoUrl = lastSource?.src;

        if (videoUrl && !videoUrl.startsWith('blob:')) {
          return {
            videoUrl: videoUrl,
            title: document.querySelector('title')?.textContent || '',
            author: document.querySelector('.author-name, .account-name')?.textContent || '',
            sourceCount: sources.length,
            extractMethod: 'source_tag'
          };
        }
      }

      // 如果没有source或source无效，尝试video.src
      if (videoElement.src && !videoElement.src.startsWith('blob:')) {
        return {
          videoUrl: videoElement.src,
          title: document.querySelector('title')?.textContent || '',
          author: document.querySelector('.author-name, .account-name')?.textContent || '',
          sourceCount: 0,
          extractMethod: 'video_src'
        };
      }

      // 提取失败
      return { 
        videoUrl: null, 
        error: `No valid video URL found (sources: ${sources.length}, video.src: ${videoElement.src?.substring(0, 50) || 'null'})`
      };
    });

    logger.info('Video extraction result:', videoInfo);

    if (!videoInfo || !videoInfo.videoUrl) {
      const errorMsg = videoInfo?.error || 'Failed to extract video URL from Douyin';
      logger.error('Video URL extraction failed:', errorMsg);
      throw new Error(errorMsg);
    }

    logger.info('Douyin video info extracted successfully, source count:', videoInfo.sourceCount);

    // 下载视频（流式下载到临时文件）
    logger.info('======== 开始下载视频 ========');
    progressCallback && progressCallback({ 
      taskId, 
      step: 'downloading', 
      message: '📥 下载视频...' 
    });

    const tempFilePath = await this.downloadVideo(videoInfo.videoUrl, progressCallback, taskId);
    logger.info('======== 下载完成，临时文件:', tempFilePath);

    // 上传到后端（流式上传）
    logger.info('======== 开始上传到后端 ========');
    progressCallback && progressCallback({ 
      taskId, 
      step: 'uploading', 
      message: '📤 上传视频...' 
    });

    const uploadResult = await this.uploadToBackend(tempFilePath, videoInfo, progressCallback, taskId);
    logger.info('======== Upload completed, result:', uploadResult);
    logger.info('uploadResult.cdnUrl:', uploadResult.cdnUrl);
    logger.info('uploadResult.videoUrl:', uploadResult.videoUrl);

    // 构建最终结果，确保使用OSS地址
    const ossVideoUrl = uploadResult.cdnUrl || uploadResult.videoUrl;
    
    // 使用 OSS 视频封面功能生成缩略图
    // 参考: https://help.aliyun.com/zh/oss/user-guide/video-snapshots
    const generateOssThumbnail = (videoUrl) => {
      if (!videoUrl) return '';
      // 添加 OSS 视频截帧参数
      // t_1000: 截取第1秒的帧
      // f_jpg: 输出格式为 jpg
      // w_0,h_0: 保持原始尺寸
      // m_fast: 快速模式
      return `${videoUrl}?x-oss-process=video/snapshot,t_1000,f_jpg,w_0,h_0,m_fast`;
    };
    
    const finalResult = {
      title: videoInfo.title,
      author: videoInfo.author,
      platform: 'douyin',
      // 关键：使用OSS地址，不是原始抖音链接
      videoUrl: ossVideoUrl,
      cdnUrl: ossVideoUrl,
      thumbnailUrl: generateOssThumbnail(ossVideoUrl),  // 使用 OSS 视频封面功能
      videoId: uploadResult.videoId,
      sourceCount: videoInfo.sourceCount
    };
    
    logger.info('======== fetchDouyin completed, final result:', finalResult);
    logger.info('Final videoUrl:', finalResult.videoUrl);
    logger.info('Final cdnUrl:', finalResult.cdnUrl);
    logger.info('Final thumbnailUrl (OSS snapshot):', finalResult.thumbnailUrl);
    return finalResult;
  }

  /**
   * 抓取 B 站视频
   */
  async fetchBilibili(page, url, taskId, progressCallback) {
    logger.info('Fetching Bilibili video:', url);
    
    progressCallback && progressCallback({ 
      taskId, 
      step: 'loading', 
      message: '📱 访问页面...' 
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
      message: '🎬 解析视频...' 
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

    const tempFilePath = await this.downloadVideo(videoInfo.videoUrl, progressCallback, taskId);
    const uploadResult = await this.uploadToBackend(tempFilePath, videoInfo, progressCallback, taskId);

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
      message: '📱 访问页面...' 
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

    const tempFilePath = await this.downloadVideo(videoInfo.videoUrl, progressCallback, taskId);
    const uploadResult = await this.uploadToBackend(tempFilePath, videoInfo, progressCallback, taskId);

    return {
      ...videoInfo,
      ...uploadResult,
      platform: 'kuaishou'
    };
  }

  /**
   * 下载视频到临时文件（流式下载，降低内存占用）
   */
  async downloadVideo(videoUrl, progressCallback, taskId) {
    logger.info('Downloading video (stream mode):', videoUrl);

    const fs = require('fs');
    const path = require('path');
    
    // 确保temp目录存在
    const tempDir = './temp';
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const tempFilePath = path.join(tempDir, `video_${taskId}.mp4`);

    try {
      const response = await axios({
        method: 'GET',
        url: videoUrl,
        responseType: 'stream',  // 流式下载
        timeout: 300000, // 5分钟超时
        maxContentLength: 800 * 1024 * 1024, // 限制800MB
      });

      const totalSize = parseInt(response.headers['content-length'] || '0');
      const sizeMB = totalSize / 1024 / 1024;
      
      // 检查文件大小
      if (totalSize > 800 * 1024 * 1024) {
        logger.error(`❌ 视频过大: ${sizeMB.toFixed(2)}MB，超过800MB限制`);
        throw new Error(`视频文件过大（${sizeMB.toFixed(0)}MB），建议使用Web版抓取`);
      }
      
      if (totalSize > 300 * 1024 * 1024) {
        logger.warn(`⚠️ 视频较大: ${sizeMB.toFixed(2)}MB，下载可能需要较长时间`);
      }

      logger.info(`开始流式下载，文件大小: ${sizeMB.toFixed(2)}MB`);

      // 创建写入流
      const writer = fs.createWriteStream(tempFilePath);
      let downloadedSize = 0;

      // 监听下载进度（仅用于统计，不显示进度消息）
      response.data.on('data', (chunk) => {
        downloadedSize += chunk.length;
      });

      // 流式写入文件
      response.data.pipe(writer);

      // 等待下载完成
      await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
        response.data.on('error', reject);
      });

      const finalSizeMB = (downloadedSize / 1024 / 1024).toFixed(2);
      logger.info(`Video downloaded to temp file, size: ${finalSizeMB}MB`);
      
      return tempFilePath;  // 返回临时文件路径而不是Buffer
    } catch (error) {
      // 清理临时文件
      if (fs.existsSync(tempFilePath)) {
        try {
          fs.unlinkSync(tempFilePath);
        } catch (e) {
          // 忽略删除错误
        }
      }
      
      logger.error('Failed to download video:', error);
      throw new Error('视频下载失败: ' + error.message);
    }
  }

  /**
   * 上传视频到后端（流式上传，降低内存占用）
   */
  async uploadToBackend(tempFilePath, videoInfo, progressCallback, taskId) {
    logger.info('Uploading video to backend (stream mode)...');

    const fs = require('fs');
    const path = require('path');

    try {
      const apiConfig = config.getApiConfig();
      const authInfo = config.getAuthInfo();

      // 获取后端URL，如果未配置则使用默认值
      let baseUrl = apiConfig.baseUrl || 'http://localhost:8080';
      
      // 验证URL格式
      if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
        baseUrl = 'http://' + baseUrl;
      }
      
      // 移除末尾的斜杠
      baseUrl = baseUrl.replace(/\/$/, '');
      
      const uploadUrl = `${baseUrl}/api/video/upload`;
      
      // 获取文件大小
      const stats = fs.statSync(tempFilePath);
      const fileSizeMB = stats.size / 1024 / 1024;
      logger.info(`准备上传视频 - URL: ${uploadUrl}, 大小: ${fileSizeMB.toFixed(2)}MB`);
      
      // 大视频警告
      if (fileSizeMB > 300) {
        logger.warn(`⚠️ 视频较大（${fileSizeMB.toFixed(0)}MB），上传可能需要较长时间，请耐心等待...`);
      }

      // 创建读取流
      const fileStream = fs.createReadStream(tempFilePath);
      
      const formData = new FormData();
      formData.append('file', fileStream, {
        filename: 'video.mp4',
        contentType: 'video/mp4',
        knownLength: stats.size  // 指定文件大小，用于进度计算
      });
      formData.append('title', videoInfo.title || '');
      formData.append('author', videoInfo.author || '');
      formData.append('platform', videoInfo.platform || 'douyin');

      const response = await axios.post(
        uploadUrl,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            'Authorization': authInfo.token ? `Bearer ${authInfo.token}` : ''
          },
          timeout: 600000, // 10分钟超时（支持大视频）
          maxBodyLength: Infinity,  // 流式上传不限制
          maxContentLength: Infinity
          // 移除 onUploadProgress，不显示进度消息
        }
      );

      logger.info('Video uploaded successfully:', response.data);
      
      // 后端返回的数据结构：{ code: 200, data: { videoUrl, cdnUrl, ... } }
      // 需要从 response.data.data 中提取
      const backendData = response.data.data || response.data;
      
      logger.info('Backend data extracted:', backendData);
      logger.info('backendData.videoUrl:', backendData.videoUrl);
      logger.info('backendData.cdnUrl:', backendData.cdnUrl);
      
      // 上传成功后删除临时文件
      try {
        fs.unlinkSync(tempFilePath);
        logger.info('Temp file deleted:', tempFilePath);
      } catch (e) {
        logger.warn('Failed to delete temp file:', e.message);
      }
      
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
      // 上传失败也要清理临时文件
      try {
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
          logger.info('Temp file deleted after error:', tempFilePath);
        }
      } catch (e) {
        logger.warn('Failed to delete temp file:', e.message);
      }
      
      logger.error('Failed to upload video:', error);
      logger.error('错误详情:', error.response?.data || error.message);
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

