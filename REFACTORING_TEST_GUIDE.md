# Puppeteer Service 重构测试指南

## 测试前准备

### 1. 确认文件已替换
```bash
# 检查备份文件是否存在
ls -l electron/services/puppeteerService.backup.js

# 检查新文件的大小和行数
wc -l electron/services/puppeteerService.js
# 应该约为 568 行
```

### 2. 重启应用
```bash
# 停止当前运行的应用
# 重新启动
npm start
```

---

## 功能测试清单

### ✅ 核心功能测试

#### 1. 抖音视频抓取
- [ ] 复制一个抖音视频链接
- [ ] 在聊天界面发送链接
- [ ] 观察思维链进度显示
- [ ] 确认视频卡片显示正常
- [ ] 点击播放视频

**预期结果**:
```
解析视频链接
完成

提取视频信息
完成

解析视频数据
完成
```

#### 2. B站视频抓取
- [ ] 复制一个B站视频链接
- [ ] 在聊天界面发送链接
- [ ] 确认抓取成功
- [ ] 验证视频播放

#### 3. 快手视频抓取（可选）
- [ ] 复制一个快手视频链接
- [ ] 测试抓取功能

### ✅ 错误处理测试

#### 1. 无效链接
- [ ] 发送一个无效的视频链接
- [ ] 确认错误提示清晰

#### 2. 大文件处理
- [ ] 测试 300MB+ 的视频
- [ ] 确认警告日志显示
- [ ] 验证下载上传成功

#### 3. 网络超时
- [ ] 断开网络
- [ ] 发送视频链接
- [ ] 确认重试机制工作
- [ ] 验证最终失败提示

### ✅ 性能测试

#### 1. 缓存功能
- [ ] 抓取一个视频
- [ ] 再次发送相同链接
- [ ] 确认使用缓存（日志中显示 "Using cached video"）
- [ ] 验证响应速度更快

#### 2. 并发测试
- [ ] 快速发送多个不同视频链接
- [ ] 确认任务队列正常工作
- [ ] 验证所有视频都能成功抓取

### ✅ 日志验证

#### 1. 日志简洁性
打开终端日志，确认：
- [ ] 无冗余的分隔线（如 "=========="）
- [ ] 关键步骤都有日志
- [ ] 错误信息清晰明确

**预期日志示例**:
```
[INFO] 尝试 1/3
[INFO] Platform: douyin
[INFO] Fetching Douyin video
[INFO] 获取到 5 个 cookies
[INFO] 视频信息提取成功, sources: 2
[INFO] Downloading video...
[INFO] Downloaded: 15.23MB
[INFO] Uploading video to backend...
[INFO] Upload size: 15.23MB
[INFO] Upload successful
[INFO] 抓取成功 (尝试 1)
```

---

## 回归测试清单

### ✅ 浏览器管理
- [ ] 首次启动正常打开浏览器
- [ ] 浏览器断开后能自动重连
- [ ] 应用关闭时浏览器正常关闭

### ✅ 文件管理
- [ ] 临时文件正常创建
- [ ] 上传成功后临时文件被删除
- [ ] 上传失败时临时文件也被删除
- [ ] temp 目录不会积累过多文件

### ✅ 内存管理
- [ ] 抓取多个视频后内存稳定
- [ ] 无内存泄漏迹象
- [ ] 大文件处理不会导致内存溢出

---

## 对比测试

### 重构前后功能对比
测试相同的视频链接，对比：

| 项目 | 重构前 | 重构后 | 状态 |
|------|--------|--------|------|
| 抖音视频抓取 | ✅ | ✅ | ✅ |
| B站视频抓取 | ✅ | ✅ | ✅ |
| 快手视频抓取 | ✅ | ✅ | ✅ |
| 视频缓存 | ✅ | ✅ | ✅ |
| 重试机制 | ✅ | ✅ | ✅ |
| 错误处理 | ✅ | ✅ | ✅ |
| 日志输出 | 冗长 | 简洁 | ✅ |
| 代码可读性 | 一般 | 优秀 | ✅ |

---

## 问题排查

### 如果出现问题

#### 1. 视频抓取失败
```bash
# 查看详细日志
npm start

# 检查是否是网络问题
ping www.douyin.com

# 检查后端服务是否正常
curl http://localhost:8080/api/video/upload
```

#### 2. 模块导入错误
```bash
# 确认文件路径正确
ls -l electron/services/puppeteerService.js

# 检查 Node.js 版本
node --version
# 应该 >= 14.0.0
```

#### 3. 恢复到重构前版本
```bash
# 如果需要回滚
cd electron/services
mv puppeteerService.js puppeteerService.refactored.js
mv puppeteerService.backup.js puppeteerService.js

# 重启应用
npm start
```

---

## 性能基准测试

### 测试脚本
创建一个简单的测试脚本 `test-refactoring.js`:

```javascript
const puppeteerService = require('./electron/services/puppeteerService');

async function test() {
  const testUrls = [
    'https://v.douyin.com/...',  // 替换为实际链接
    'https://www.bilibili.com/...',
  ];

  for (const url of testUrls) {
    console.time(`Fetch ${url}`);
    
    try {
      const result = await puppeteerService.fetchVideo(url, (progress) => {
        console.log(`Progress: ${progress.step} - ${progress.message}`);
      });
      
      console.log('Success:', result.title);
    } catch (error) {
      console.error('Failed:', error.message);
    }
    
    console.timeEnd(`Fetch ${url}`);
  }

  await puppeteerService.cleanup();
}

test();
```

运行测试:
```bash
node test-refactoring.js
```

---

## 验收标准

重构被认为成功的标准：

✅ **功能完整性**
- 所有平台的视频抓取正常工作
- 缓存功能正常
- 重试机制有效
- 错误处理妥当

✅ **性能稳定**
- 无性能下降
- 内存使用稳定
- 无新增的崩溃或错误

✅ **代码质量**
- 代码行数减少约 21%
- 日志输出简洁清晰
- 代码结构更清晰
- 易于维护和扩展

✅ **向后兼容**
- 所有公共 API 保持不变
- 返回值结构一致
- 行为与重构前相同

---

## 报告模板

测试完成后，填写以下报告：

```markdown
## Puppeteer Service 重构测试报告

**测试日期**: YYYY-MM-DD
**测试人员**: [姓名]
**测试环境**: 
- OS: Windows/Mac/Linux
- Node.js版本: x.x.x
- 应用版本: x.x.x

### 测试结果

#### 功能测试
- [ ] 抖音视频抓取: ✅/❌
- [ ] B站视频抓取: ✅/❌
- [ ] 快手视频抓取: ✅/❌
- [ ] 错误处理: ✅/❌
- [ ] 缓存功能: ✅/❌

#### 性能测试
- [ ] 内存使用: 正常/异常
- [ ] 响应速度: 正常/变慢/变快
- [ ] 日志输出: 简洁/冗长

#### 发现的问题
1. [问题描述]
2. [问题描述]

#### 总体评价
- 功能完整性: ⭐⭐⭐⭐⭐
- 代码可读性: ⭐⭐⭐⭐⭐
- 性能表现: ⭐⭐⭐⭐⭐

#### 建议
[测试建议和改进意见]

#### 结论
[ ] ✅ 重构成功，可以投入使用
[ ] ⚠️ 需要修复问题后再使用
[ ] ❌ 建议回滚到重构前版本
```

---

## 联系方式

如有问题，请查看：
1. `REFACTORING_SUMMARY.md` - 重构详细说明
2. `puppeteerService.backup.js` - 重构前的备份文件
3. 项目日志文件 - 查看详细错误信息

