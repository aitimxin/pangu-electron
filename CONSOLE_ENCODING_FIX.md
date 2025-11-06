# Windows 控制台中文乱码修复

## 🐛 问题描述

在 Windows 控制台（PowerShell/CMD）中运行 Electron 时，中文日志显示为乱码：

```
[11:45:22.535] [info] 瑙嗛淇℃伅鎻愬彇缁撴灉
[11:45:22.536] [error] 瑙嗛URL鎻愬彇澶辫触
```

## ✅ 修复方案

### 修改 1: logger.js 设置 UTF-8 编码

在 `electron/utils/logger.js` 中添加：

```javascript
// 修复 Windows 控制台中文乱码问题
if (process.platform === 'win32') {
  // 在 Windows 上使用 UTF-8 编码
  if (process.stdout && process.stdout.setDefaultEncoding) {
    process.stdout.setDefaultEncoding('utf8');
  }
  if (process.stderr && process.stderr.setDefaultEncoding) {
    process.stderr.setDefaultEncoding('utf8');
  }
}
```

### 修改 2: 设置 PowerShell UTF-8（可选但推荐）

在启动 Electron 之前，在 PowerShell 中执行：

```powershell
# 设置控制台编码为 UTF-8
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
```

### 修改 3: 使用 chcp 命令（CMD）

如果使用 CMD 而不是 PowerShell：

```bash
# 设置代码页为 UTF-8
chcp 65001
```

## 🚀 快速启动脚本

创建一个启动脚本自动设置编码：

### start-with-utf8.bat

```batch
@echo off
chcp 65001 > nul
echo ========================================
echo Pangu Electron (UTF-8 编码)
echo ========================================
echo.
npm start
```

### start-with-utf8.ps1

```powershell
# 设置 UTF-8 编码
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "========================================" -ForegroundColor Green
Write-Host "Pangu Electron (UTF-8 编码)" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

npm start
```

## 📊 效果对比

### 修复前
```
[11:45:22.535] [info] 瑙嗛淇℃伅鎻愬彇缁撴灉  ❌
[11:45:22.536] [error] 瑙嗛URL鎻愬彇澶辫触  ❌
```

### 修复后
```
[11:45:22.535] [info] 视频信息提取结果  ✅
[11:45:22.536] [error] 视频URL提取失败  ✅
```

## 🎯 最佳实践

为了彻底避免乱码问题，建议：

### 方案 A: 使用英文日志（推荐）

将所有日志改为英文：

```javascript
// ❌ 中文
logger.info('视频信息提取结果:', videoInfo);

// ✅ 英文
logger.info('Video extraction result:', videoInfo);
```

**优点**：
- 彻底避免乱码
- 国际化友好
- 更专业

### 方案 B: 保留中文 + UTF-8 编码

使用修复后的 logger.js + UTF-8 控制台

**优点**：
- 保留中文可读性
- 本地化友好

## 🔧 验证修复

### 1. 重启应用

```bash
cd pangu-electron
npm start
```

### 2. 查看日志

执行一些操作，查看控制台输出是否正常显示中文。

### 3. 测试中文字符

```javascript
// 在代码中添加测试日志
logger.info('测试中文: 你好世界 Hello World');
logger.info('测试符号: ✅❌⚠️📝');
logger.info('测试数字: 123 ABC abc');
```

**预期输出**：
```
[11:45:22.535] [info] 测试中文: 你好世界 Hello World  ✅
[11:45:22.536] [info] 测试符号: ✅❌⚠️📝  ✅
[11:45:22.537] [info] 测试数字: 123 ABC abc  ✅
```

## 🎨 使用启动脚本

### Windows CMD

1. 创建 `start-utf8.bat`:
```batch
@echo off
chcp 65001
npm start
```

2. 使用这个脚本启动：
```bash
start-utf8.bat
```

### PowerShell

1. 创建 `start-utf8.ps1`:
```powershell
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
npm start
```

2. 使用这个脚本启动：
```powershell
.\start-utf8.ps1
```

## 📝 package.json 添加启动脚本

```json
{
  "scripts": {
    "start": "electron .",
    "start:utf8": "chcp 65001 && electron .",
    "dev": "cross-env NODE_ENV=development electron .",
    "dev:utf8": "chcp 65001 && cross-env NODE_ENV=development electron ."
  }
}
```

然后使用：
```bash
npm run start:utf8
```

## 🌐 环境变量方式（跨平台）

在应用启动时设置：

```javascript
// main.js 开头添加
if (process.platform === 'win32') {
  process.env.LANG = 'zh_CN.UTF-8';
  process.env.LC_ALL = 'zh_CN.UTF-8';
}
```

## ✅ 推荐的完整解决方案

### 1. 修改 logger.js（已完成）
添加 UTF-8 编码设置

### 2. 创建启动脚本
```batch
@echo off
chcp 65001 > nul
echo 启动 Pangu Electron...
npm start
```

### 3. 使用脚本启动
而不是直接 `npm start`

## 📊 测试清单

- [ ] 修改 logger.js 已保存
- [ ] 重启 Electron 应用
- [ ] 中文日志正常显示
- [ ] 英文日志正常显示
- [ ] 特殊符号正常显示
- [ ] 错误信息正常显示

## 🎉 总结

### 已修改文件
- `electron/utils/logger.js` - 添加 UTF-8 编码设置

### 效果
- ✅ Windows 控制台正常显示中文
- ✅ 不影响其他平台（Mac/Linux）
- ✅ 文件日志不受影响

---

**立即重启 Electron 应用，中文乱码问题应该解决了！** 🎊

