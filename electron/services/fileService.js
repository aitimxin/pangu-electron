/**
 * File Service
 * 文件操作服务
 */

const fs = require('fs').promises;
const path = require('path');
const { app } = require('electron');
const logger = require('../utils/logger');

class FileService {
  constructor() {
    this.userDataPath = app.getPath('userData');
    this.downloadsPath = app.getPath('downloads');
  }

  /**
   * 保存文件
   * @param {string} filePath - 文件路径
   * @param {any} data - 文件数据
   * @returns {Promise<boolean>}
   */
  async saveFile(filePath, data) {
    try {
      logger.info('Saving file:', filePath);
      
      // 确保目录存在
      const dir = path.dirname(filePath);
      await this.ensureDir(dir);

      // 写入文件
      if (Buffer.isBuffer(data)) {
        await fs.writeFile(filePath, data);
      } else if (typeof data === 'object') {
        await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
      } else {
        await fs.writeFile(filePath, data, 'utf8');
      }

      logger.info('File saved successfully');
      return true;
    } catch (error) {
      logger.error('Failed to save file:', error);
      throw error;
    }
  }

  /**
   * 读取文件
   * @param {string} filePath - 文件路径
   * @param {string} encoding - 编码格式
   * @returns {Promise<any>}
   */
  async readFile(filePath, encoding = 'utf8') {
    try {
      logger.info('Reading file:', filePath);
      const data = await fs.readFile(filePath, encoding);
      return data;
    } catch (error) {
      logger.error('Failed to read file:', error);
      throw error;
    }
  }

  /**
   * 删除文件
   * @param {string} filePath - 文件路径
   * @returns {Promise<boolean>}
   */
  async deleteFile(filePath) {
    try {
      logger.info('Deleting file:', filePath);
      await fs.unlink(filePath);
      logger.info('File deleted successfully');
      return true;
    } catch (error) {
      logger.error('Failed to delete file:', error);
      throw error;
    }
  }

  /**
   * 检查文件是否存在
   * @param {string} filePath - 文件路径
   * @returns {Promise<boolean>}
   */
  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 确保目录存在
   * @param {string} dirPath - 目录路径
   */
  async ensureDir(dirPath) {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      // 目录已存在
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }
  }

  /**
   * 保存对话记录
   * @param {string} conversationId - 对话ID
   * @param {object} data - 对话数据
   */
  async saveConversation(conversationId, data) {
    const conversationsDir = path.join(this.userDataPath, 'conversations');
    await this.ensureDir(conversationsDir);
    
    const filePath = path.join(conversationsDir, `${conversationId}.json`);
    await this.saveFile(filePath, data);
    
    logger.info('Conversation saved:', conversationId);
  }

  /**
   * 读取对话记录
   * @param {string} conversationId - 对话ID
   */
  async readConversation(conversationId) {
    const filePath = path.join(this.userDataPath, 'conversations', `${conversationId}.json`);
    
    if (!(await this.fileExists(filePath))) {
      return null;
    }
    
    const data = await this.readFile(filePath);
    return JSON.parse(data);
  }

  /**
   * 导出对话记录
   * @param {string} conversationId - 对话ID
   * @param {object} data - 对话数据
   * @param {string} format - 导出格式 (json/txt/md)
   */
  async exportConversation(conversationId, data, format = 'json') {
    const fileName = `conversation_${conversationId}_${Date.now()}.${format}`;
    const filePath = path.join(this.downloadsPath, fileName);

    let content;
    switch (format) {
      case 'json':
        content = JSON.stringify(data, null, 2);
        break;
      
      case 'txt':
        content = this.formatConversationAsText(data);
        break;
      
      case 'md':
        content = this.formatConversationAsMarkdown(data);
        break;
      
      default:
        throw new Error('Unsupported export format: ' + format);
    }

    await this.saveFile(filePath, content);
    logger.info('Conversation exported:', filePath);
    
    return filePath;
  }

  /**
   * 格式化对话为纯文本
   */
  formatConversationAsText(data) {
    let text = `对话标题: ${data.title || '未命名对话'}\n`;
    text += `创建时间: ${new Date(data.createdAt).toLocaleString()}\n`;
    text += `消息数量: ${data.messages.length}\n`;
    text += '\n' + '='.repeat(50) + '\n\n';

    data.messages.forEach((msg, index) => {
      const role = msg.role === 'user' ? '用户' : 'AI';
      const time = new Date(msg.timestamp).toLocaleString();
      text += `[${index + 1}] ${role} (${time}):\n`;
      text += `${msg.content}\n\n`;
    });

    return text;
  }

  /**
   * 格式化对话为 Markdown
   */
  formatConversationAsMarkdown(data) {
    let md = `# ${data.title || '未命名对话'}\n\n`;
    md += `**创建时间**: ${new Date(data.createdAt).toLocaleString()}\n\n`;
    md += `**消息数量**: ${data.messages.length}\n\n`;
    md += '---\n\n';

    data.messages.forEach((msg, index) => {
      const role = msg.role === 'user' ? '👤 用户' : '🤖 AI';
      const time = new Date(msg.timestamp).toLocaleString();
      md += `## ${role} *(${time})*\n\n`;
      md += `${msg.content}\n\n`;
      md += '---\n\n';
    });

    return md;
  }

  /**
   * 清理临时文件
   */
  async cleanupTempFiles() {
    const tempDir = path.join(this.userDataPath, 'temp');
    
    try {
      if (await this.fileExists(tempDir)) {
        const files = await fs.readdir(tempDir);
        
        for (const file of files) {
          const filePath = path.join(tempDir, file);
          const stats = await fs.stat(filePath);
          
          // 删除超过24小时的临时文件
          const age = Date.now() - stats.mtime.getTime();
          if (age > 24 * 60 * 60 * 1000) {
            await this.deleteFile(filePath);
            logger.info('Deleted old temp file:', file);
          }
        }
      }
    } catch (error) {
      logger.error('Failed to cleanup temp files:', error);
    }
  }

  /**
   * 获取用户数据目录
   */
  getUserDataPath() {
    return this.userDataPath;
  }

  /**
   * 获取下载目录
   */
  getDownloadsPath() {
    return this.downloadsPath;
  }
}

// 导出单例
const fileService = new FileService();

module.exports = fileService;







