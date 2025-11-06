# 视频封面缩略图显示方案

## 🎯 已实现的方案

### 方案 1: 从视频页面提取封面图 ✅

在视频信息提取时，会尝试多种方式获取封面图：

```javascript
const extractThumbnail = () => {
  // 方法1: video.poster 属性
  if (videoElement.poster && videoElement.poster !== '') {
    return videoElement.poster;
  }
  
  // 方法2: 页面中的封面图片（多种选择器）
  const coverSelectors = [
    'img[class*="video-player-cover"]',  // 视频播放器封面
    'img[class*="cover"]',               // 通用封面
    'img[class*="poster"]',              // 海报
    'img[class*="thumbnail"]',           // 缩略图
    '.video-cover img',                  // 视频封面容器
    '[data-e2e="video-cover"] img',     // 抖音特定属性
    '.basicPlayer img'                   // 播放器内图片
  ];
  
  for (const selector of coverSelectors) {
    const img = document.querySelector(selector);
    if (img && img.src && !img.src.startsWith('data:') && !img.src.startsWith('blob:')) {
      return img.src;
    }
  }
  
  return '';
};
```

### 方案 2: 截取视频第一帧（备用方案） ✅

如果页面没有找到封面图，会尝试截取页面（包含视频第一帧）：

```javascript
if (!videoInfo.poster || videoInfo.poster === '') {
  const screenshot = await page.screenshot({
    clip: { x: 0, y: 0, width: 800, height: 600 }
  });
  
  // 保存为临时文件
  fs.writeFileSync(`./temp/thumbnail_${taskId}.jpg`, screenshot);
}
```

## 📊 数据流程

```
1. 视频页面
   ↓ 提取封面图
videoInfo.poster = "https://p3-pc.douyinpic.com/xxx.jpeg"
   ↓
2. 传递给 finalResult
thumbnailUrl = videoInfo.poster || uploadResult.thumbnailUrl
   ↓
3. 返回给前端
{
  thumbnailUrl: "https://p3-pc.douyinpic.com/xxx.jpeg",
  videoUrl: "https://pangu-ai-agent.oss-cn-beijing.aliyuncs.com/...",
  ...
}
   ↓
4. 前端显示
<VideoCard thumbnail={msg.thumbnailUrl} />
   ↓
5. 显示缩略图
<div style="backgroundImage: url('https://p3-pc.douyinpic.com/xxx.jpeg')" />
```

## 🔍 调试方法

### 1. 查看浏览器窗口（已开启可见模式）

当浏览器窗口打开时：
1. 按 F12 打开开发者工具
2. 切换到 Elements 标签
3. 查找封面图片元素

**检查点**：
- [ ] 是否有 `<video poster="...">` 属性？
- [ ] 是否有带 class="cover" 的 img 元素？
- [ ] poster/cover 的 src 是什么？

### 2. 查看 Electron 日志

```
Extracted poster/thumbnail: Yes  ← 应该显示 Yes
Final thumbnailUrl: https://p3-pc.douyinpic.com/...  ← 应该有值
```

### 3. 查看前端日志

```
[Electron] 完整返回数据: {
  thumbnailUrl: "https://p3-pc.douyinpic.com/...",  ← 应该有值
  ...
}
```

## 🎨 可能的封面图来源

### 抖音平台

封面图通常在这些位置：
- `<video poster="...">`
- `<img class="video-player-cover">`
- `<img class="basicPlayer-cover">`
- 页面背景图

### B站平台

- `<video poster="...">`
- `.bili-video-card__cover`
- `.video-cover img`

### 快手平台

- `<video poster="...">`
- `.video-info-cover img`

## 🛠️ 如果仍然没有缩略图

### 选项 1: 使用默认占位图

```javascript
// VideoCard.tsx
const thumbnail = props.thumbnail || '/default-video-cover.jpg';
```

### 选项 2: 从视频文件生成缩略图（后端）

使用 ffmpeg 生成：

```java
// VideoController.java
public String generateThumbnail(MultipartFile videoFile) {
    // 保存临时视频文件
    File tempVideo = File.createTempFile("video_", ".mp4");
    videoFile.transferTo(tempVideo);
    
    // 使用 ffmpeg 提取第一帧
    File thumbnailFile = File.createTempFile("thumb_", ".jpg");
    
    ProcessBuilder pb = new ProcessBuilder(
        "ffmpeg",
        "-i", tempVideo.getAbsolutePath(),
        "-ss", "00:00:01",
        "-vframes", "1",
        "-vf", "scale=320:-1",
        thumbnailFile.getAbsolutePath()
    );
    pb.start().waitFor();
    
    // 上传缩略图到OSS
    String thumbnailUrl = ossService.uploadThumbnail(
        Files.readAllBytes(thumbnailFile.toPath()),
        "thumbnail.jpg"
    );
    
    // 清理临时文件
    tempVideo.delete();
    thumbnailFile.delete();
    
    return thumbnailUrl;
}
```

### 选项 3: 前端实时生成（Canvas）

使用 HTML5 Canvas 从视频第一帧生成：

```typescript
// VideoCard.tsx
const [thumbnail, setThumbnail] = useState(props.thumbnail);

useEffect(() => {
  if (!thumbnail && url) {
    // 从视频生成缩略图
    const video = document.createElement('video');
    video.src = url;
    video.crossOrigin = 'anonymous';
    
    video.addEventListener('loadeddata', () => {
      video.currentTime = 1; // 跳到第1秒
    });
    
    video.addEventListener('seeked', () => {
      const canvas = document.createElement('canvas');
      canvas.width = 320;
      canvas.height = 180;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      setThumbnail(canvas.toDataURL('image/jpeg'));
    });
  }
}, [url, thumbnail]);
```

## ✅ 推荐方案（当前已实现）

### 优先级：

1. **从视频页面提取封面图** ✅（已实现）
   - 快速
   - 无需额外处理
   - 通常是高质量图片

2. **截取视频第一帧** ✅（已实现）
   - 备用方案
   - 自动生成

3. **使用默认占位图**（可选）
   - 最后的备选
   - 简单可靠

## 🚀 立即测试

```bash
# 重启 Electron
taskkill /F /IM electron.exe
cd pangu-electron
start-utf8.bat
```

### 测试步骤

1. 抓取视频
2. 观察日志：
   ```
   Extracted poster/thumbnail: Yes
   Final thumbnailUrl: https://p3-pc.douyinpic.com/...
   ```
3. 查看视频卡片，应该显示封面图

## 📊 预期效果

### 有封面图
```
┌─────────────────────────┐
│ [视频封面图片]          │  ← 显示抖音封面
│    ▶️        00:45      │
├─────────────────────────┤
│ 视频标题                │
│ 大小: 73.94 MB          │
└─────────────────────────┘
```

### 无封面图（备用）
```
┌─────────────────────────┐
│ [视频第一帧截图]        │  ← 显示截图
│    ▶️        00:45      │
├─────────────────────────┤
│ 视频标题                │
│ 大小: 73.94 MB          │
└─────────────────────────┘
```

## 🎉 总结

- ✅ 从页面提取封面图
- ✅ 支持多种选择器
- ✅ 备用方案：截取第一帧
- ✅ 优先级明确

**立即重启测试，现在应该有缩略图了！** 🖼️✨

