# 安装指南

## 📥 用户安装指南

### Windows 用户

#### 方式 1：安装版（推荐）

1. 下载 `Pangu-AI-Agent-Setup-1.0.0.exe`
2. 双击运行安装程序
3. 选择安装路径
4. 完成安装
5. 从开始菜单或桌面快捷方式启动

**特点**：
- ✅ 自动创建快捷方式
- ✅ 添加到开始菜单
- ✅ 支持自动更新
- ✅ 卸载方便

#### 方式 2：便携版

1. 下载 `Pangu-AI-Agent-1.0.0.exe`
2. 放置到任意目录
3. 双击运行
4. 无需安装，即开即用

**特点**：
- ✅ 无需安装
- ✅ 绿色便携
- ✅ 可存放在 U 盘
- ⚠️ 需手动更新

#### 首次运行注意事项

**Windows Defender 警告**：

由于应用未签名，Windows Defender 可能会阻止运行：

1. 出现"Windows 已保护你的电脑"提示
2. 点击"更多信息"
3. 点击"仍要运行"

**防火墙提示**：

首次运行可能提示防火墙警告：
- 应用需要访问网络进行视频抓取
- 点击"允许访问"

### macOS 用户

#### 安装步骤

1. 下载 `Pangu-AI-Agent-1.0.0.dmg`
2. 双击打开 DMG 文件
3. 拖动应用图标到 Applications 文件夹
4. 从 Launchpad 或 Applications 启动

#### 首次运行注意事项

**"无法打开，因为无法验证开发者"提示**：

由于应用未签名，macOS Gatekeeper 会阻止运行：

**方法 1：通过右键菜单打开**
1. 在 Applications 中找到应用
2. 按住 Control 点击应用图标
3. 选择"打开"
4. 点击"打开"确认

**方法 2：通过终端允许**
```bash
sudo xattr -rd com.apple.quarantine /Applications/Pangu\ AI\ Agent.app
```

**方法 3：通过系统设置**
1. 打开"系统偏好设置"
2. 进入"安全性与隐私"
3. 点击"仍要打开"

### Linux 用户

#### Ubuntu/Debian 用户

**使用 deb 包安装**：

```bash
# 下载 deb 包
wget https://releases.example.com/pangu-ai-agent_1.0.0_amd64.deb

# 安装
sudo dpkg -i pangu-ai-agent_1.0.0_amd64.deb

# 如果有依赖问题，运行
sudo apt-get install -f

# 启动应用
pangu-ai-agent
```

#### 通用 Linux（AppImage）

**使用 AppImage**：

```bash
# 下载 AppImage
wget https://releases.example.com/Pangu-AI-Agent-1.0.0.AppImage

# 添加执行权限
chmod +x Pangu-AI-Agent-1.0.0.AppImage

# 运行
./Pangu-AI-Agent-1.0.0.AppImage
```

**可选：集成到系统**

```bash
# 移动到 /opt
sudo mv Pangu-AI-Agent-1.0.0.AppImage /opt/pangu-ai-agent

# 创建桌面快捷方式
cat > ~/.local/share/applications/pangu-ai-agent.desktop << EOF
[Desktop Entry]
Name=Pangu AI Agent
Exec=/opt/pangu-ai-agent
Icon=pangu-ai-agent
Type=Application
Categories=Utility;
EOF
```

#### 安装依赖

某些 Linux 发行版需要安装额外依赖：

**Ubuntu/Debian**:
```bash
sudo apt-get update
sudo apt-get install -y \
  libgtk-3-0 \
  libnotify4 \
  libnss3 \
  libxss1 \
  libxtst6 \
  xdg-utils \
  libatspi2.0-0 \
  libdrm2 \
  libgbm1 \
  libasound2
```

**CentOS/RHEL/Fedora**:
```bash
sudo yum install -y \
  gtk3 \
  libnotify \
  nss \
  libXScrnSaver \
  libXtst \
  xdg-utils \
  at-spi2-atk \
  libdrm \
  mesa-libgbm \
  alsa-lib
```

**Arch Linux**:
```bash
sudo pacman -S gtk3 libnotify nss libxss libxtst xdg-utils at-spi2-atk libdrm mesa alsa-lib
```

## 🔧 开发者安装指南

### 前置要求

确保已安装：
- **Node.js** 18.0 或更高版本
- **npm** 或 **yarn**
- **Git**

### 克隆项目

```bash
# 克隆仓库
git clone https://github.com/your-org/pangu-project.git

# 进入项目目录
cd pangu-project/pangu-electron
```

### 安装依赖

```bash
# 使用 npm
npm install

# 或使用 yarn
yarn install

# 或使用国内镜像（推荐）
npm install --registry=https://registry.npmmirror.com
```

**注意**：
- 首次安装会下载 Chromium（约 150MB），可能需要较长时间
- 如果下载失败，查看 [QUICK_START.md](./QUICK_START.md) 的问题解决部分

### 配置环境

```bash
# 复制环境配置
cp .env.example .env

# 编辑 .env 文件，设置您的配置
```

### 启动开发模式

```bash
# 1. 先启动前端项目（另一个终端）
cd ../pangu-agent-front
npm install
npm start

# 2. 启动 Electron（回到 pangu-electron 目录）
cd ../pangu-electron
npm run dev
```

### 构建和打包

```bash
# 构建前端
cd ../pangu-agent-front
npm run build

# 打包 Electron
cd ../pangu-electron
npm run build

# 打包产物在 dist/ 目录
```

## 📋 系统要求

### 最低系统要求

| 操作系统 | 最低版本 | 推荐版本 |
|---------|---------|---------|
| **Windows** | Windows 10 | Windows 10/11 |
| **macOS** | macOS 10.14 (Mojave) | macOS 12+ (Monterey) |
| **Linux** | Ubuntu 18.04 / Debian 10 | Ubuntu 22.04 / Debian 12 |

### 硬件要求

| 组件 | 最低要求 | 推荐配置 |
|-----|---------|---------|
| **CPU** | 双核处理器 | 四核或更高 |
| **内存** | 4 GB RAM | 8 GB RAM 或更高 |
| **存储** | 500 MB 可用空间 | 1 GB 可用空间 |
| **网络** | 宽带互联网连接 | 宽带互联网连接 |

## 🔄 更新指南

### 自动更新（推荐）

应用内置自动更新功能：

1. 启动应用时自动检查更新
2. 发现新版本后提示下载
3. 后台静默下载
4. 下载完成后提示重启安装
5. 重启应用自动完成更新

### 手动更新

如果自动更新失败：

1. 从官网下载最新版本
2. 安装新版本（会覆盖旧版本）
3. 用户数据和配置自动保留

### 降级（不推荐）

如果新版本有问题需要降级：

1. 卸载当前版本
2. 安装旧版本
3. 可选：备份用户数据目录

## 🗑️ 卸载指南

### Windows 卸载

**安装版**：
1. 打开"设置" → "应用" → "应用和功能"
2. 找到"Pangu AI Agent"
3. 点击"卸载"
4. 按提示完成卸载

或

1. 打开"控制面板" → "程序和功能"
2. 找到"Pangu AI Agent"
3. 右键选择"卸载"

**便携版**：
直接删除应用文件即可

**清理用户数据**（可选）：
删除目录：`%APPDATA%\pangu-agent-electron`

### macOS 卸载

1. 打开 Finder
2. 进入"应用程序"文件夹
3. 找到"Pangu AI Agent"
4. 拖动到废纸篓
5. 清空废纸篓

**清理用户数据**（可选）：
```bash
rm -rf ~/Library/Application\ Support/pangu-agent-electron
rm -rf ~/Library/Logs/pangu-agent-electron
rm -rf ~/Library/Caches/pangu-agent-electron
```

### Linux 卸载

**使用 deb 包安装的**：
```bash
sudo apt-get remove pangu-ai-agent
```

**使用 AppImage 的**：
```bash
rm /opt/pangu-ai-agent
rm ~/.local/share/applications/pangu-ai-agent.desktop
```

**清理用户数据**（可选）：
```bash
rm -rf ~/.config/pangu-agent-electron
rm -rf ~/.cache/pangu-agent-electron
```

## 🐛 安装问题排查

### 问题 1：安装包下载很慢

**解决方案**：
- 使用下载工具（如 IDM、迅雷）
- 更换下载镜像
- 使用 VPN（如果在境外）

### 问题 2：Windows 安装后无法启动

**可能原因**：
- 系统缺少必要组件
- 防病毒软件阻止

**解决方案**：
1. 安装 [Visual C++ Redistributable](https://aka.ms/vs/17/release/vc_redist.x64.exe)
2. 临时关闭防病毒软件
3. 以管理员权限运行

### 问题 3：macOS 提示"已损坏"

**解决方案**：
```bash
# 移除隔离属性
sudo xattr -cr /Applications/Pangu\ AI\ Agent.app

# 如果还不行，重新下载安装包
```

### 问题 4：Linux 缺少依赖

**解决方案**：
查看上方"安装依赖"部分，根据您的发行版安装所需依赖

## 📞 获取帮助

如果遇到安装问题：

1. 查看 [常见问题文档](./FAQ.md)
2. 搜索已有的 [Issues](https://github.com/your-org/pangu-project/issues)
3. 提交新的 Issue，并提供：
   - 操作系统版本
   - 安装方式
   - 详细错误信息
   - 截图（如果可能）

---

**祝安装顺利！** 🎉

