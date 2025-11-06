/**
 * 视频URL测试脚本
 * 用于验证视频上传后返回的URL是否正确
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

async function testVideoUpload() {
  console.log('========== 开始测试视频上传 ==========\n');

  // 配置
  const baseUrl = 'http://localhost:8080';
  const uploadUrl = `${baseUrl}/api/video/upload`;

  console.log('上传URL:', uploadUrl);

  // 创建一个测试文件（如果没有视频文件，创建一个小的测试文件）
  const testFilePath = path.join(__dirname, 'test-video.mp4');
  
  if (!fs.existsSync(testFilePath)) {
    console.log('\n⚠️  未找到测试视频文件，创建一个虚拟文件...');
    // 创建一个小的测试文件
    fs.writeFileSync(testFilePath, Buffer.alloc(1024 * 100)); // 100KB
    console.log('✅ 创建测试文件:', testFilePath);
  }

  try {
    // 准备表单数据
    const formData = new FormData();
    formData.append('file', fs.createReadStream(testFilePath), {
      filename: 'test-video.mp4',
      contentType: 'video/mp4'
    });
    formData.append('title', '测试视频');
    formData.append('platform', 'douyin');
    formData.append('author', '测试作者');

    console.log('\n📤 发送上传请求...\n');

    // 发送请求
    const response = await axios.post(uploadUrl, formData, {
      headers: formData.getHeaders(),
      timeout: 60000
    });

    console.log('========== 后端返回数据 ==========');
    console.log(JSON.stringify(response.data, null, 2));
    console.log('=====================================\n');

    // 验证返回的URL
    const { videoUrl, cdnUrl } = response.data;

    console.log('========== URL 验证 ==========');
    console.log('videoUrl:', videoUrl);
    console.log('cdnUrl:', cdnUrl);
    console.log('');

    // 检查是否是OSS地址
    const isOssUrl = (url) => {
      if (!url) return false;
      return url.includes('oss-cn-') || 
             url.includes('.aliyuncs.com') || 
             url.includes('cdn.');
    };

    console.log('videoUrl 是否是 OSS 地址:', isOssUrl(videoUrl) ? '✅ 是' : '❌ 否');
    console.log('cdnUrl 是否是 OSS 地址:', isOssUrl(cdnUrl) ? '✅ 是' : '❌ 否');
    console.log('=================================\n');

    if (!isOssUrl(videoUrl) || !isOssUrl(cdnUrl)) {
      console.log('❌ 错误: 返回的URL不是OSS地址！');
      console.log('\n可能的原因:');
      console.log('1. OSS 服务未启用');
      console.log('2. OSS 配置错误');
      console.log('3. uploadFile 方法返回了错误的值');
      console.log('\n请检查:');
      console.log('- application.yml 中 oss.enabled = true');
      console.log('- OSS 配置参数是否正确');
      console.log('- 后端日志中是否有 OSS 初始化成功的消息');
    } else {
      console.log('✅ 成功: URL 正确使用了 OSS 地址！');
      
      // 测试访问
      console.log('\n========== 测试访问 OSS 文件 ==========');
      console.log('尝试访问:', videoUrl);
      
      try {
        const testResponse = await axios.head(videoUrl, { timeout: 10000 });
        console.log('✅ 文件可访问');
        console.log('状态码:', testResponse.status);
        console.log('Content-Type:', testResponse.headers['content-type']);
        console.log('Content-Length:', testResponse.headers['content-length']);
      } catch (error) {
        console.log('❌ 文件无法访问');
        console.log('错误:', error.message);
        if (error.response) {
          console.log('状态码:', error.response.status);
          if (error.response.status === 403) {
            console.log('\n⚠️  权限问题: 文件可能没有设置公共读权限');
            console.log('解决方案: 参考 OSS_ACL_FIX.md');
          }
        }
      }
      console.log('========================================');
    }

    console.log('\n✅ 测试完成！');

  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n⚠️  无法连接到后端服务');
      console.log('请确保后端服务已启动: http://localhost:8080');
    } else if (error.response) {
      console.log('\n后端返回错误:');
      console.log('状态码:', error.response.status);
      console.log('错误信息:', error.response.data);
    } else {
      console.log('\n完整错误:', error);
    }
  }
}

// 运行测试
testVideoUpload().catch(console.error);

