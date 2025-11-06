# 视频URL提取逻辑简化

## 📝 修改说明

### 简化前
使用3种复杂方法提取视频URL：
1. 从 source 标签提取
2. 从 script 标签中用正则提取
3. 从 window 全局对象提取

代码复杂，维护困难，容易出错。

### 简化后
只使用一种简单直接的方法：

```javascript
// 1. 等待页面完全加载（3秒）
await new Promise(resolve => setTimeout(resolve, 3000));

// 2. 查找 video 元素
const videoElement = document.querySelector('video');

// 3. 获取所有 source 子元素
const sources = videoElement.querySelectorAll('source');

// 4. 取最后一个 source 的 src
const lastSource = sources[sources.length - 1];
const videoUrl = lastSource?.src;
```

## ✅ 优势

1. **代码简洁**: 只有10行核心代码
2. **逻辑清晰**: 容易理解和维护
3. **可靠性高**: 最后一个source通常是最高质量的视频
4. **性能好**: 不需要遍历所有script标签

## 📊 提取流程

```
访问抖音页面
    ↓
等待3秒（确保页面完全加载）
    ↓
查找 <video> 元素
    ↓
获取所有 <source> 子元素
    ↓
取最后一个 <source> 的 src 属性
    ↓
验证：
  - 不是 null
  - 不是 blob: URL
  - 是有效的 http/https URL
    ↓
返回视频URL ✅
```

## 🎯 错误处理

### 情况 1: 未找到 video 元素
```
错误: 未找到 video 元素
```

**可能原因**：
- 页面加载不完全
- 网站结构改变
- 被反爬虫拦截

### 情况 2: 没有 source 子元素
```
错误: 找到 video 元素但没有 source 子元素
```

**可能原因**：
- 视频使用 video.src 而不是 source
- 视频尚未加载

### 情况 3: source 的 src 无效
```
错误: 最后一个 source 的 src 无效（共 3 个 source，最后一个src: blob:xxx）
```

**可能原因**：
- 使用了 blob URL（浏览器本地URL）
- 需要等待更长时间

## 🔧 调试建议

### 增加等待时间

如果3秒不够，可以增加：

```javascript
// 修改这一行（第216行）
await new Promise(resolve => setTimeout(resolve, 5000)); // 5秒
```

### 添加视频元素等待

```javascript
// 等待视频元素出现
await page.waitForSelector('video', { timeout: 10000 });
await new Promise(resolve => setTimeout(resolve, 2000));
```

### 截图调试

添加截图查看页面状态：

```javascript
await page.screenshot({ path: `temp/debug_${taskId}.png` });
logger.info('已保存调试截图');
```

## 📋 提取结果示例

### 成功
```javascript
{
  videoUrl: "https://www.douyin.com/aweme/v1/play/?file_id=xxx...",
  title: "据说在评论区能蹲到对象？...",
  author: "xxx",
  poster: "https://...",
  sourceCount: 3
}
```

### 失败
```javascript
{
  videoUrl: null,
  error: "最后一个 source 的 src 无效（共 3 个 source，最后一个src: blob:xxx）",
  title: "据说在评论区能蹲到对象？..."
}
```

## 🚀 使用方法

### 1. 重启 Electron 应用

**重要：代码已更新，必须重启！**

```bash
# Windows
cd pangu-electron
restart-electron.bat

# 手动重启
# 1. 关闭应用
# 2. 清理缓存: del /S /Q cache temp
# 3. npm start
```

### 2. 测试抓取

```
用户: "抓取视频 https://v.douyin.com/xxx"
```

### 3. 查看日志

**成功的日志**：
```
开始提取视频URL...
视频信息提取结果: { videoUrl: 'https://...', sourceCount: 3 }
从 3 个 source 标签中提取到视频URL
Douyin video info extracted: {...}
======== 开始下载视频 ========
```

**失败的日志**：
```
开始提取视频URL...
视频信息提取结果: { videoUrl: null, error: '...' }
视频URL提取失败: ...
```

## ⚠️ 注意事项

### 1. 页面加载时间

不同视频页面加载速度不同，3秒可能不够：
- 小视频：1-2秒
- 大视频：3-5秒
- 网络慢：5-10秒

### 2. 抖音反爬虫

抖音可能更新页面结构或加强反爬虫，导致：
- video 元素结构变化
- source 标签不存在
- 需要登录才能访问

### 3. 短链接处理

短链接（如 `https://v.douyin.com/xxx`）会重定向到完整URL，Puppeteer 会自动处理。

## 📊 与旧逻辑对比

| 特性 | 旧逻辑 | 新逻辑 |
|-----|--------|--------|
| 代码行数 | ~150行 | ~40行 ✅ |
| 提取方法 | 3种方法 | 1种方法 ✅ |
| 正则表达式 | 10+个 | 0个 ✅ |
| 可维护性 | 低 | 高 ✅ |
| 调试难度 | 高 | 低 ✅ |
| 性能 | 一般 | 好 ✅ |

## 🎉 总结

- ✅ 代码简化了 70%
- ✅ 逻辑更清晰
- ✅ 更容易调试
- ✅ 更容易扩展

**现在重启 Electron 应用测试吧！** 🚀

---

## 📅 更新日志

### 2025-11-06
- ✅ 简化视频URL提取逻辑
- ✅ 只使用最后一个 source 标签
- ✅ 删除复杂的正则匹配
- ✅ 添加详细的错误信息
- ✅ 增加页面加载等待时间

