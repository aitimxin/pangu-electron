/**
 * Post Install Script
 * 安装后执行的脚本
 */

const fs = require('fs');
const path = require('path');

console.log('Running post-install script...');

// 创建必要的目录
const dirs = [
  'logs',
  'temp',
  'cache'
];

dirs.forEach(dir => {
  const dirPath = path.join(__dirname, '..', dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`Created directory: ${dir}/`);
  }
});

// 检查环境文件
const envExamplePath = path.join(__dirname, '..', '.env.example');
const envPath = path.join(__dirname, '..', '.env');

if (!fs.existsSync(envPath) && fs.existsSync(envExamplePath)) {
  console.log('Creating .env file from .env.example...');
  fs.copyFileSync(envExamplePath, envPath);
  console.log('.env file created. Please update it with your configuration.');
}

console.log('Post-install script completed!');








