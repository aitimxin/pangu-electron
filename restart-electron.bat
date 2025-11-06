@echo off
echo ========================================
echo Electron 强制重启脚本
echo ========================================
echo.

echo [1/5] 关闭所有 Electron 进程...
taskkill /F /IM electron.exe 2>nul
taskkill /F /IM node.exe 2>nul
timeout /t 2 >nul

echo [2/5] 清理缓存目录...
if exist cache rmdir /S /Q cache
if exist temp rmdir /S /Q temp
if exist node_modules\.cache rmdir /S /Q node_modules\.cache
mkdir cache 2>nul
mkdir temp 2>nul

echo [3/5] 验证代码版本...
findstr /C:"最终使用的OSS URL" electron\services\puppeteerService.js >nul
if %ERRORLEVEL% EQU 0 (
    echo ✅ 代码已更新
) else (
    echo ❌ 代码还是旧的！请检查文件是否保存！
    pause
    exit /b 1
)

echo [4/5] 检查后端服务...
curl -s http://localhost:8080/health >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo ✅ 后端服务正常
) else (
    echo ⚠️ 后端服务未启动，请先启动后端
)

echo [5/5] 启动 Electron...
echo.
echo ========================================
echo 正在启动，请等待...
echo ========================================
echo.

npm start

