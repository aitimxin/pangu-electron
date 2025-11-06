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
          message: `检测视频平台...（尝试 ${attempt}/${maxRetries}）` 
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
          message: `等待重试...（${delayMs/1000}秒后进行第 ${attempt + 1} 次尝试）` 
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

    // 步骤1: 先访问抖音首页获取cookie
    progressCallback && progressCallback({ 
      taskId, 
      step: 'loading', 
      message: '正在访问抖音首页获取cookie...' 
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
    progressCallback && progressCallback({ 
      taskId, 
      step: 'loading', 
      message: '正在访问目标视频页面...' 
    });

    logger.info('Step 2: Visiting target video page with cookies...');
    await page.goto(url, { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });

    progressCallback && progressCallback({ 
      taskId, 
      step: 'extracting', 
      message: '正在提取视频信息...' 
    });

    // 提取视频信息（使用多种方法）
    const videoInfo = await page.evaluate(() => {
      const debugInfo = [];
      
      // 方法1: 从 source 标签提取（优先，通常包含真实URL）
      debugInfo.push('尝试方法1: source标签');
      const videoElement = document.querySelector('video');
      if (videoElement) {
        const sources = videoElement.querySelectorAll('source');
        debugInfo.push(`找到 ${sources.length} 个source标签`);
        
        if (sources.length > 0) {
          // 优先获取第三个source（如果有），否则获取最后一个
          const sourceIndex = sources.length >= 3 ? 2 : sources.length - 1;
          const sourceUrl = sources[sourceIndex]?.src;
          
          if (sourceUrl && !sourceUrl.startsWith('blob:')) {
            debugInfo.push(`从source[${sourceIndex}]提取成功: ${sourceUrl.substring(0, 50)}...`);
            return {
              videoUrl: sourceUrl,
              title: document.querySelector('title')?.textContent || '',
              author: document.querySelector('.author-name, .account-name')?.textContent || '',
              poster: videoElement.poster || '',
              debugInfo
            };
          } else {
            debugInfo.push(`source[${sourceIndex}]是blob URL，跳过`);
          }
        }
        
        // 尝试video标签的src（如果不是blob）
        if (videoElement.src && !videoElement.src.startsWith('blob:')) {
          debugInfo.push('从video.src提取成功');
          return {
            videoUrl: videoElement.src,
            title: document.querySelector('title')?.textContent || '',
            author: document.querySelector('.author-name, .account-name')?.textContent || '',
            poster: videoElement.poster || '',
            debugInfo
          };
        }
      } else {
        debugInfo.push('未找到video元素');
      }

      // 方法2: 从页面script中提取
      debugInfo.push('尝试方法2: script标签');
      const scripts = document.querySelectorAll('script');
      for (const script of scripts) {
        const text = script.textContent || '';
        
        // 查找包含视频URL的script
        if (text.includes('playAddr') || text.includes('video_url') || text.includes('videoUrl')) {
          debugInfo.push('找到包含视频数据的script');
          
          // 尝试多种正则模式
          const patterns = [
            // playAddr 格式
            /"playAddr":\s*"([^"]+)"/,
            /playAddr"?:\s*"([^"]+)"/,
            /'playAddr':\s*'([^']+)'/,
            
            // video_url 格式
            /"video_url":\s*"([^"]+)"/,
            /video_url"?:\s*"([^"]+)"/,
            
            // videoUrl 格式
            /"videoUrl":\s*"([^"]+)"/,
            /videoUrl"?:\s*"([^"]+)"/,
            
            // src 格式
            /"src":\s*"(https?:\/\/[^"]*\.mp4[^"]*)"/,
          ];

          for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match && match[1] && !match[1].startsWith('blob:')) {
              debugInfo.push(`正则匹配成功: ${pattern.toString()}`);
              return {
                videoUrl: match[1],
                title: document.querySelector('title')?.textContent || '',
                author: document.querySelector('.author-name, .account-name')?.textContent || '',
                debugInfo
              };
            }
          }
        }
      }

      // 方法3: 从 window 全局对象提取
      debugInfo.push('尝试方法3: window全局对象');
      try {
        // __INITIAL_STATE__
        if (window.__INITIAL_STATE__) {
          debugInfo.push('找到__INITIAL_STATE__');
          const state = window.__INITIAL_STATE__;
          if (state.video?.playAddr) {
            debugInfo.push('从__INITIAL_STATE__.video.playAddr提取成功');
            return {
              videoUrl: state.video.playAddr,
              title: state.video.desc || state.video.title || '',
              author: state.video.author?.nickname || '',
              debugInfo
            };
          }
        }
      } catch (e) {
        debugInfo.push('window对象提取失败: ' + e.message);
      }

      debugInfo.push('所有方法都失败');
      return { videoUrl: null, debugInfo };
    });

    // 输出调试信息
    if (videoInfo.debugInfo) {
      logger.info('视频提取调试信息:', videoInfo.debugInfo);
    }

    if (!videoInfo || !videoInfo.videoUrl) {
      throw new Error('Failed to extract video URL from Douyin');
    }

    logger.info('Douyin video info extracted:', videoInfo);

    // 下载视频（流式下载到临时文件）
    logger.info('======== 开始下载视频 ========');
    progressCallback && progressCallback({ 
      taskId, 
      step: 'downloading', 
      message: '正在下载视频...' 
    });

    const tempFilePath = await this.downloadVideo(videoInfo.videoUrl, progressCallback, taskId);
    logger.info('======== 下载完成，临时文件:', tempFilePath);

    // 上传到后端（流式上传）
    logger.info('======== 开始上传到后端 ========');
    progressCallback && progressCallback({ 
      taskId, 
      step: 'uploading', 
      message: '正在上传视频...' 
    });

    const uploadResult = await this.uploadToBackend(tempFilePath, videoInfo, progressCallback, taskId);
    logger.info('======== 上传完成，结果:', uploadResult);

    const finalResult = {
      ...videoInfo,
      ...uploadResult,
      platform: 'douyin'
    };
    
    logger.info('======== fetchDouyin 完成，最终结果:', finalResult);
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

      // 监听下载进度
      response.data.on('data', (chunk) => {
        downloadedSize += chunk.length;
        
        if (totalSize > 0) {
          const percentCompleted = Math.round((downloadedSize * 100) / totalSize);
          const downloadedMB = (downloadedSize / 1024 / 1024).toFixed(2);
          const totalMB = sizeMB.toFixed(2);
          
          progressCallback && progressCallback({
            taskId,
            step: 'downloading',
            message: `下载中... ${percentCompleted}% (${downloadedMB}MB/${totalMB}MB)`,
            progress: percentCompleted
          });
        }
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
          maxContentLength: Infinity,
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            const uploadedMB = (progressEvent.loaded / 1024 / 1024).toFixed(2);
            const totalMB = (progressEvent.total / 1024 / 1024).toFixed(2);
            
            progressCallback && progressCallback({
              taskId,
              step: 'uploading',
              message: `上传中... ${percentCompleted}% (${uploadedMB}MB/${totalMB}MB)`,
              progress: percentCompleted
            });
          }
        }
      );

      logger.info('Video uploaded successfully:', response.data);
      
      // 上传成功后删除临时文件
      try {
        fs.unlinkSync(tempFilePath);
        logger.info('Temp file deleted:', tempFilePath);
      } catch (e) {
        logger.warn('Failed to delete temp file:', e.message);
      }
      
      return {
        videoId: response.data.videoId,
        cdnUrl: response.data.cdnUrl || response.data.videoUrl,
        thumbnailUrl: response.data.thumbnailUrl
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

