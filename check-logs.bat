@echo off
echo ========================================
echo 检查 Electron 日志
echo ========================================
echo.

echo 最近的日志文件:
dir /O-D /B logs\*.log 2>nul

echo.
echo ========================================
echo 查找上传相关日志:
echo ========================================
findstr /C:"后端上传响应" /C:"上传完成" /C:"fetchDouyin 完成" logs\*.log 2>nul

echo.
echo ========================================
echo 查找 OSS 相关日志:
echo ========================================
findstr /C:"OSS" /C:"cdnUrl" /C:"aliyuncs" logs\*.log 2>nul

echo.
echo 完成！
pause

