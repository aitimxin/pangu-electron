# 视频缩略图 - 快速测试

## 🎯 已实现的功能

### ✅ 自动提取封面图

从视频页面提取封面图，支持多种来源：
1. `<video poster="...">` 属性
2. 页面中的封面图片元素
3. 如果都没有，截取页面作为缩略图

## 🚀 立即测试

```bash
# 重启 Electron
taskkill /F /IM electron.exe
cd pangu-electron
start-utf8.bat
```

## 📊 预期效果

### 日志输出

```
Extracted poster/thumbnail: Yes  ← 成功提取封面图
Final thumbnailUrl: https://p3-pc.douyinpic.com/xxx.jpeg  ← 封面图URL
```

### 界面显示

视频卡片应该显示封面图：

```
┌─────────────────────────┐
│ [视频封面图片] ✅       │  ← 现在有图了
│    ▶️        00:45      │
├─────────────────────────┤
│ 视频标题                │
│ 大小: 73.94 MB          │
│ [▶️ 播放] [📥] [🔗]    │
└─────────────────────────┘
```

## 🔍 如果仍然没有缩略图

### 检查 1: 查看日志

```
Extracted poster/thumbnail: No  ← 没有提取到
```

**说明**：视频页面没有封面图元素

**解决**：会自动截取视频第一帧
```
No poster found, trying to capture video first frame...
Video frame captured as thumbnail: temp/thumbnail_xxx.jpg
```

### 检查 2: 查看浏览器窗口

当浏览器窗口打开时（已开启可见模式）：

1. 按 F12 打开开发者工具
2. 查找封面图片：

```javascript
// 在控制台运行
const video = document.querySelector('video');
console.log('video.poster:', video.poster);

const coverImg = document.querySelector('img[class*="cover"]');
console.log('cover image:', coverImg?.src);
```

### 检查 3: 查看前端数据

```javascript
// 在浏览器控制台
const msg = messages[messages.length - 1];
console.log('thumbnailUrl:', msg.thumbnailUrl);
```

**应该有值**：
```
thumbnailUrl: "https://p3-pc.douyinpic.com/xxx.jpeg"
```

**如果是空**：
```
thumbnailUrl: ""  或  undefined
```

说明没有正确传递。

## 🎨 添加默认占位图（可选）

如果经常没有缩略图，可以添加默认图：

### 前端添加默认图

```typescript
// VideoCard.tsx
const displayThumbnail = thumbnail || '/assets/default-video-cover.jpg';

<div
  className="video-thumbnail"
  style={{
    backgroundImage: displayThumbnail ? `url(${displayThumbnail})` : 'none',
    backgroundColor: displayThumbnail ? 'transparent' : '#000',
  }}
>
```

## 🔧 高级方案：生成真实缩略图

### 方案 A: 使用 ffmpeg（后端）

在后端使用 ffmpeg 从视频生成缩略图：

```java
// VideoController.java - 添加 ffmpeg 依赖后

// 上传视频后
String videoUrl = ossService.uploadFile(...);

// 生成缩略图
File tempVideo = saveTempFile(file);
File thumbnailFile = generateThumbnailWithFFmpeg(tempVideo, "00:00:01");

// 上传缩略图到OSS
byte[] thumbnailData = Files.readAllBytes(thumbnailFile.toPath());
String thumbnailUrl = ossService.uploadThumbnail(thumbnailData, "thumbnail.jpg");

response.put("thumbnailUrl", thumbnailUrl);  // 真实的缩略图
```

### 方案 B: 使用 Canvas（前端）

前端实时从视频生成：

```typescript
// 添加到 VideoCard.tsx

const generateThumbnail = (videoUrl: string) => {
  const video = document.createElement('video');
  video.src = videoUrl;
  video.crossOrigin = 'anonymous';
  video.currentTime = 1;  // 跳到第1秒
  
  video.onloadeddata = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 180;
    const ctx = canvas.getContext('2d');
    ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const thumbnailDataUrl = canvas.toDataURL('image/jpeg', 0.8);
    setGeneratedThumbnail(thumbnailDataUrl);
  };
};

useEffect(() => {
  if (!thumbnail && url) {
    generateThumbnail(url);
  }
}, [url, thumbnail]);
```

## 📝 当前实现的优势

### ✅ 优点

1. **快速**：直接从页面提取，无需额外处理
2. **高质量**：使用官方封面图
3. **零成本**：不需要服务器端处理
4. **多重备份**：支持多种提取方式

### ⚠️ 限制

1. **跨域问题**：抖音封面图可能有防盗链
2. **链接时效**：封面图链接可能过期
3. **依赖页面结构**：页面改版可能失效

## 💡 最佳实践

### 推荐方案

**当前实现（从页面提取）** + **前端Canvas备用方案**

组合使用：
1. 优先使用页面提取的封面图
2. 如果没有或加载失败，用 Canvas 从视频生成
3. 最后使用默认占位图

### 实现步骤

1. **已完成**：Electron 端提取封面图
2. **待实现**：前端 Canvas 备用方案（可选）
3. **待添加**：默认占位图（可选）

## 🧪 测试清单

- [ ] 重启 Electron 应用
- [ ] 抓取视频
- [ ] 查看日志：`Extracted poster/thumbnail: Yes`
- [ ] 查看日志：`Final thumbnailUrl: https://...`
- [ ] 前端显示视频卡片
- [ ] 封面图正常显示
- [ ] 点击播放正常

## 📊 故障排除

### 问题：日志显示 `Extracted poster: Yes` 但前端仍无图

**检查**：
1. thumbnailUrl 是否正确传递到前端？
2. 图片 URL 是否可访问？
3. 是否有 CORS 跨域问题？

**解决**：
- 在浏览器直接访问 thumbnailUrl
- 检查是否返回 403 Forbidden
- 如果跨域，考虑使用 Canvas 方案

### 问题：封面图加载很慢

**原因**：图片文件大或网络慢

**解决**：
- 使用懒加载
- 添加加载状态
- 压缩图片大小

## 🎉 总结

- ✅ 已实现从页面提取封面图
- ✅ 支持多种封面图来源
- ✅ 有截图备用方案
- ✅ 优先级清晰

**立即重启测试，应该可以看到封面图了！** 🖼️✨

---

## 📅 更新日志

### 2025-11-06
- ✅ 添加封面图提取逻辑
- ✅ 支持多种选择器
- ✅ 添加截图备用方案
- ✅ 优先使用页面封面图

