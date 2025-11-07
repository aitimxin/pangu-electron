/**
 * Local API Server (Optional)
 * 本地 API 服务器 - 可选模块，用于开发调试
 */

const express = require('express');
const cors = require('cors');
const logger = require('../utils/logger');
const config = require('../utils/config');
const puppeteerService = require('./puppeteerService');

class LocalApiServer {
  constructor() {
    this.app = null;
    this.server = null;
    this.port = 3001;
    this.isRunning = false;
  }

  /**
   * 启动本地 API 服务器
   */
  start() {
    if (this.isRunning) {
      logger.warn('Local API server already running');
      return;
    }

    this.app = express();

    // 中间件
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // 请求日志
    this.app.use((req, res, next) => {
      logger.debug(`${req.method} ${req.path}`);
      next();
    });

    // 注册路由
    this.registerRoutes();

    // 启动服务器
    this.server = this.app.listen(this.port, () => {
      this.isRunning = true;
      logger.info(`Local API server started on http://localhost:${this.port}`);
    });

    // 错误处理
    this.server.on('error', (error) => {
      logger.error('Local API server error:', error);
      this.isRunning = false;
    });
  }

  /**
   * 注册路由
   */
  registerRoutes() {
    // 健康检查
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        timestamp: Date.now()
      });
    });

    // 获取配置
    this.app.get('/api/config', (req, res) => {
      const { key } = req.query;
      const value = key ? config.get(key) : config.export();
      res.json({ success: true, data: value });
    });

    // 设置配置
    this.app.post('/api/config', (req, res) => {
      const { key, value } = req.body;
      config.set(key, value);
      res.json({ success: true });
    });

    // 抓取视频
    this.app.post('/api/fetch-video', async (req, res) => {
      try {
        const { url } = req.body;
        
        if (!url) {
          return res.status(400).json({
            success: false,
            error: 'URL is required'
          });
        }

        const result = await puppeteerService.fetchVideo(url, (progress) => {
          // 这里可以通过 WebSocket 推送进度
          logger.debug('Progress:', progress);
        });

        res.json({
          success: true,
          data: result
        });
      } catch (error) {
        logger.error('Failed to fetch video:', error);
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // 错误处理
    this.app.use((error, req, res, next) => {
      logger.error('API error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    });

    // 404 处理
    this.app.use((req, res) => {
      res.status(404).json({
        success: false,
        error: 'Not found'
      });
    });
  }

  /**
   * 停止服务器
   */
  stop() {
    if (this.server) {
      this.server.close(() => {
        this.isRunning = false;
        logger.info('Local API server stopped');
      });
    }
  }

  /**
   * 获取服务器状态
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      port: this.port,
      url: `http://localhost:${this.port}`
    };
  }
}

// 导出单例
const localApiServer = new LocalApiServer();

module.exports = localApiServer;








