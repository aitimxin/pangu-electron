# 🚨 紧急重启指南

## 问题确认

**你的 Electron 正在运行旧代码！**

证据：
- 后端返回了正确的 OSS 地址 ✅
- 但前端接收到的是抖音原始链接 ❌
- 返回数据中有 `debugInfo` 字段（旧代码的特征）

## ⚡ 立即执行（按顺序）

### 1. 完全关闭 Electron

**Windows**:
```bash
# 打开任务管理器 (Ctrl+Shift+Esc)
# 找到所有 "Electron" 相关进程
# 全部结束进程

# 或使用命令行
taskkill /F /IM electron.exe
taskkill /F /IM node.exe
```

**Mac/Linux**:
```bash
# 杀掉所有 Electron 进程
pkill -9 Electron
pkill -9 node
```

### 2. 清理所有缓存

```bash
cd pangu-electron

# 删除缓存目录
rmdir /S /Q cache
rmdir /S /Q temp
rmdir /S /Q node_modules\.cache

# 重新创建
mkdir cache
mkdir temp
```

### 3. 验证代码已更新

```bash
# 检查代码中是否有新的日志
findstr "最终使用的OSS URL" electron\services\puppeteerService.js
```

**如果没有输出**，说明文件没有保存！请重新保存文件。

**预期输出**：
```
      logger.info('最终使用的OSS URL:', ossUrl);
```

### 4. 重启 Electron

```bash
# 确保在 pangu-electron 目录
npm start
```

### 5. 抓取新视频测试

打开浏览器控制台（F12），抓取视频，**必须看到新的日志**：

**新代码的日志标志**：
```
========== 后端上传响应 ==========
完整响应数据: {...}
response.data.cdnUrl: https://...oss...
========== 构建返回对象 ==========
最终使用的OSS URL: https://...oss...
是否是OSS地址: true
返回给调用者的对象: {...}
====================================
```

**如果仍然没有这些日志**，说明代码还是旧的！

## 🔍 验证代码版本

运行这个命令：
```bash
cd pangu-electron
check-electron-code.bat
```

**必须看到**：
```
electron\services\puppeteerService.js:374:      videoUrl: uploadResult.cdnUrl,
electron\services\puppeteerService.js:684:      logger.info('最终使用的OSS URL:', ossUrl);
```

如果没有，说明代码没有保存或被覆盖了。

## 🛠️ 强制刷新代码

如果确认代码已修改但仍不生效：

### 方法 1: 使用开发模式

```bash
cd pangu-electron

# 开发模式启动（会实时加载代码）
npm run dev
```

### 方法 2: 重新安装依赖

```bash
cd pangu-electron

# 删除 node_modules
rmdir /S /Q node_modules

# 重新安装
npm install

# 启动
npm start
```

### 方法 3: 检查文件时间戳

```bash
# 查看文件最后修改时间
dir electron\services\puppeteerService.js
```

确认修改时间是最近的。

## 📋 完整检查清单

- [ ] **关闭所有 Electron 进程**
  - [ ] 任务管理器中没有 electron.exe
  - [ ] 任务管理器中没有相关的 node.exe

- [ ] **验证代码已保存**
  - [ ] 运行 `check-electron-code.bat`
  - [ ] 看到 "videoUrl: uploadResult.cdnUrl"

- [ ] **清理缓存**
  - [ ] cache 目录已清空
  - [ ] temp 目录已清空

- [ ] **重启应用**
  - [ ] `npm start` 成功启动

- [ ] **测试抓取**
  - [ ] 看到新的日志格式
  - [ ] 日志中显示 "最终使用的OSS URL"
  - [ ] cdnUrl 不是 undefined

- [ ] **验证功能**
  - [ ] [VideoCard] 是否是OSS地址: true
  - [ ] 视频可以播放

## ⚠️ 重要提示

**Electron 应用会缓存 JavaScript 代码！**

即使你修改了文件，如果应用没有完全重启，仍然会运行旧代码。

**必须**：
1. 完全关闭应用（杀进程）
2. 清理缓存
3. 重新启动

## 🎯 预期的正确日志

### Electron 日志（必须看到）
```
========== 后端上传响应 ==========
完整响应数据: {
  "success": true,
  "videoUrl": "https://pangu-ai-agent.oss-cn-beijing.aliyuncs.com/...",
  "cdnUrl": "https://pangu-ai-agent.oss-cn-beijing.aliyuncs.com/...",
  ...
}
response.data.cdnUrl: https://pangu-ai-agent.oss-cn-beijing.aliyuncs.com/...
========== 构建返回对象 ==========
最终使用的OSS URL: https://pangu-ai-agent.oss-cn-beijing.aliyuncs.com/...
是否是OSS地址: true
返回给调用者的对象: {
  "videoUrl": "https://pangu-ai-agent.oss-cn-beijing.aliyuncs.com/...",
  "cdnUrl": "https://pangu-ai-agent.oss-cn-beijing.aliyuncs.com/...",
  ...
}
```

### 前端日志（必须看到）
```
[Electron] 完整返回数据: {
  "videoUrl": "https://pangu-ai-agent.oss-cn-beijing.aliyuncs.com/...",
  "cdnUrl": "https://pangu-ai-agent.oss-cn-beijing.aliyuncs.com/...",
  ...
}
[Electron] videoData.cdnUrl: https://pangu-ai-agent.oss-cn-beijing.aliyuncs.com/...
[Electron] finalVideoUrl: https://pangu-ai-agent.oss-cn-beijing.aliyuncs.com/...
[Electron] 是否是OSS地址: true

[VideoCard] 接收到的视频URL: https://pangu-ai-agent.oss-cn-beijing.aliyuncs.com/...
[VideoCard] 是否是OSS地址: true
```

**如果看不到这些日志，说明代码仍然是旧的！**

---

**请立即按照上述步骤执行，然后告诉我结果！** 🚀

