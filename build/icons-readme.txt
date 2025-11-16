图标文件说明
============

本目录需要放置应用图标文件，用于不同平台的打包：

1. icon.ico (Windows)
   - 分辨率：256x256 或更高
   - 格式：ICO
   - 用途：Windows 安装包、任务栏图标

2. icon.icns (macOS)
   - 分辨率：512x512 或更高
   - 格式：ICNS
   - 用途：macOS DMG 安装包、Dock 图标

3. icon.png (Linux)
   - 分辨率：512x512 或更高
   - 格式：PNG (透明背景)
   - 用途：Linux AppImage、系统图标

4. icon@2x.png (可选)
   - 分辨率：1024x1024
   - 格式：PNG (透明背景)
   - 用途：高分辨率屏幕

图标制作建议：
- 使用简洁、易识别的设计
- 确保在小尺寸下（16x16）仍然清晰
- 使用品牌色彩
- 考虑深色/浅色背景的兼容性

在线图标生成工具：
- https://www.electron.build/icons
- https://icon.kitchen
- https://www.iconfinder.com

注意：请将实际的图标文件放置在此目录下，并删除本说明文件。


















