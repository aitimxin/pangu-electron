/**
 * Logger Utility
 * 日志工具 - 使用 electron-log 进行日志记录
 */

const log = require('electron-log');
const path = require('path');
const { app } = require('electron');

// 配置日志
class Logger {
  constructor() {
    // 设置日志文件路径
    if (app) {
      log.transports.file.resolvePathFn = () => {
        return path.join(app.getPath('userData'), 'logs', 'main.log');
      };
    }

    // 设置日志级别
    log.transports.file.level = 'info';
    log.transports.console.level = process.env.NODE_ENV === 'development' ? 'debug' : 'info';

    // 设置日志格式
    log.transports.file.format = '[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}';
    log.transports.console.format = '[{h}:{i}:{s}.{ms}] [{level}] {text}';

    // 设置文件大小限制（10MB）
    log.transports.file.maxSize = 10 * 1024 * 1024;
  }

  /**
   * 调试日志
   */
  debug(...args) {
    log.debug(...args);
  }

  /**
   * 信息日志
   */
  info(...args) {
    log.info(...args);
  }

  /**
   * 警告日志
   */
  warn(...args) {
    log.warn(...args);
  }

  /**
   * 错误日志
   */
  error(...args) {
    log.error(...args);
  }

  /**
   * 记录带上下文的日志
   */
  logWithContext(level, context, message, data = null) {
    const logMessage = `[${context}] ${message}`;
    if (data) {
      log[level](logMessage, data);
    } else {
      log[level](logMessage);
    }
  }

  /**
   * 记录操作日志
   */
  logOperation(operation, status, details = null) {
    const message = `Operation: ${operation} - Status: ${status}`;
    if (details) {
      this.info(message, details);
    } else {
      this.info(message);
    }
  }

  /**
   * 记录性能日志
   */
  logPerformance(operation, duration) {
    this.info(`Performance: ${operation} took ${duration}ms`);
  }
}

// 导出单例
const logger = new Logger();

module.exports = logger;

