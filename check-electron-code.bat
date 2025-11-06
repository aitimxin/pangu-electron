@echo off
echo ========================================
echo 检查 Electron 代码是否更新
echo ========================================
echo.

echo 检查 fetchDouyin 方法中的返回值:
findstr /N /C:"videoUrl: uploadResult.cdnUrl" electron\services\puppeteerService.js

echo.
echo 检查 uploadToBackend 方法中的返回值:
findstr /N /C:"最终使用的OSS URL" electron\services\puppeteerService.js

echo.
echo 如果上面没有输出，说明代码还是旧的！
echo 请确保文件已保存并重启应用。
echo.
pause

