# PC 一键换机迁移工具 — 设计规格书

> 日期：2026-05-02 | 状态：待评审

## 一、产品概述

开源免费的 Windows 电脑数据迁移工具，帮助用户换新电脑时一键传输文件、浏览器数据、应用配置和系统设置。支持局域网直连和外接存储两种传输方式。

### 竞品参照

| 竞品 | 模式 | 不足 |
|------|------|------|
| Laplink PCmover Pro | 付费 $79.95 | 价格高，英文为主 |
| EaseUS Todo PCTrans | 免费版受限 + Pro 付费 | 免费版阉割严重 |
| 联想 AI 换机 | 联想品牌独占 | 绑定硬件品牌 |
| 微软 Windows 备份 | 内置 Win10/11 | 仅文件+设置，不含应用 |
| 奇客电脑迁移 | 共享软件 | 知名度低，信任度低 |

差异化：开源免费、真正一键操作、现代化 UI、不绑定品牌。

---

## 二、技术栈

| 层 | 技术 |
|----|------|
| 桌面壳 | Electron ^33.x |
| UI 框架 | React + React Router |
| 构建 | Vite (渲染进程) + electron-builder (打包) |
| 网络传输 | WebSocket (ws) + mDNS 服务发现 |
| 系统操作 | PowerShell 5.1 脚本（通过 child_process 调度） |
| 数据打包 | tar-stream + gzip |
| 加密 | Node.js crypto (AES-256-GCM, PBKDF2) |
| 浏览器数据读取 | better-sqlite3 (SQLite) + DPAPI 解密 |
| 测试 | Vitest (前端/主进程) + Pester (PowerShell) |

---

## 三、整体架构

```
┌──────────────────────────────────────────────┐
│              Electron App (UI Layer)          │
│  ┌─────────┐  ┌──────────┐  ┌─────────────┐  │
│  │ 设置页   │  │ 迁移主页  │  │ 传输进度页   │  │
│  └────┬────┘  └─────┬────┘  └──────┬──────┘  │
│       └──────────────┼──────────────┘         │
│              ┌───────┴───────┐                │
│              │  React 路由    │                │
│              └───────┬───────┘                │
├──────────────────────┼────────────────────────┤
│         Electron Main Process                  │
│  ┌──────────┐ ┌──────────┐ ┌───────────────┐ │
│  │ 网络传输  │ │ 存储导出  │ │ PowerShell    │ │
│  │ (WS/mDNS)│ │ (文件打包) │ │  脚本调度器    │ │
│  └──────────┘ └──────────┘ └───────────────┘ │
├────────────────────────────────────────────────┤
│         PowerShell Scripts (系统采集层)         │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ │
│  │浏览器   │ │系统设置 │ │应用配置 │ │文件扫描 │ │
│  │数据提取 │ │备份还原 │ │收集     │ │        │ │
│  └────────┘ └────────┘ └────────┘ └────────┘ │
└────────────────────────────────────────────────┘
```

分层原则：
- Electron 主进程：协调调度，不直接操作 Windows API
- PowerShell 脚本：每个脚本单一职责，可独立测试
- React 渲染进程：纯 UI，通过 IPC 与主进程通信

---

## 四、模块划分 & 目录结构

```
pc-data-migration/
├── package.json
├── electron/
│   ├── main.ts                    # Electron 主进程入口
│   ├── preload.ts                 # 预加载脚本 (IPC 桥接)
│   ├── network/
│   │   ├── server.ts              # WebSocket 服务端 (旧电脑侧)
│   │   ├── client.ts              # WebSocket 客户端 (新电脑侧)
│   │   ├── pairing.ts             # 配对码生成与验证
│   │   └── mdns.ts               # mDNS 服务发现
│   ├── storage/
│   │   ├── packager.ts            # 打包为 .pcmig 文件
│   │   ├── extractor.ts           # 解包还原
│   │   └── manifest.ts            # manifest 读写
│   ├── scanner/
│   │   ├── index.ts               # 扫描调度器
│   │   ├── file-scanner.ts        # 文件扫描
│   │   └── category-resolver.ts   # 解析桌面/文档/图片等分类
│   └── powershell/
│       └── runner.ts              # PS 脚本调度器
├── scripts/
│   ├── browser/
│   │   ├── export-chrome.ps1      # Chrome 书签/密码/历史
│   │   ├── export-edge.ps1        # Edge 数据
│   │   ├── export-firefox.ps1     # Firefox 数据
│   │   └── import-browser.ps1     # 统一导入脚本
│   ├── system/
│   │   ├── export-settings.ps1    # 壁纸/任务栏/主题等
│   │   └── import-settings.ps1    # 还原系统设置
│   ├── apps/
│   │   ├── export-wechat.ps1      # 微信聊天记录
│   │   ├── export-office.ps1      # Office 模板/设置
│   │   ├── export-input-method.ps1 # 输入法词库
│   │   └── export-app-list.ps1    # 已安装软件清单
│   └── common/
│       └── utils.ps1              # 共享函数库
├── src/                           # React 渲染进程
│   ├── App.tsx
│   ├── pages/
│   │   ├── WelcomePage.tsx
│   │   ├── TransferMethodPage.tsx
│   │   ├── PairingPage.tsx
│   │   ├── ScanPreviewPage.tsx
│   │   ├── TransferProgressPage.tsx
│   │   └── CompletePage.tsx
│   ├── components/
│   │   ├── FileTree.tsx
│   │   ├── ProgressBar.tsx
│   │   └── CategoryCard.tsx
│   └── hooks/
│       └── useIpc.ts
└── resources/
```

---

## 五、传输协议 & 数据格式

### 统一打包格式 `.pcmig`

本质为 tar.gz + manifest：

```
migration_bundle.pcmig
├── manifest.json        # 元数据清单
├── files/               # 用户文件（保持原目录结构）
├── browser/             # 浏览器数据
│   ├── chrome/
│   ├── edge/
│   └── firefox/
├── app_configs/         # 应用配置
└── system_settings/     # 系统设置导出
```

### manifest.json

```json
{
  "version": "1.0",
  "source": {
    "hostname": "...",
    "os": "Windows 11",
    "os_version": "10.0.22631",
    "arch": "x64",
    "username": "..."
  },
  "timestamp": "2026-05-02T10:30:00Z",
  "total_size": 1234567890,
  "sections": {
    "files": { "size": 1000000000, "count": 5000, "root": "%UserProfile%" },
    "browser": { "size": 50000000, "browsers": ["chrome", "edge"] },
    "app_configs": { "size": 200000000, "apps": ["wechat", "office"] },
    "system_settings": { "size": 1000000, "items": ["wallpaper", "taskbar"] }
  }
}
```

### 传输流程

**局域网直传模式：**
```
旧电脑                          新电脑
  │                               │
  │  1. 生成 6 位配对码            │
  │  2. 启动 mDNS 广播 + WS Server │
  │     ← 输入配对码 ────────────  │
  │  3. 验证 + 建立 TLS WebSocket  │
  │  4. 扫描 & 发送预览清单 ──────→ │
  │     ← 用户勾选/确认 ────────── │
  │  5. 逐节打包流式传输 ────────→  │
  │  6. 等待确认完成               │
  │                               │  7. 调用 PS 脚本还原
```

**外接存储模式：**
```
旧电脑                          存储设备                 新电脑
  │                               │                       │
  │  1. 选择导出路径 (U盘等)        │                       │
  │  2. 扫描 & 预览清单            │                       │
  │  3. 打包写入 .pcmig ──────────→                        │
  │  4. 完成                       │                       │
  │                               │  5. 插入新电脑,选择导入  │
  │                               │  6. 读取 manifest ────→  │
  │                               │  7. 调用 PS 脚本还原   │
```

---

## 六、UI 页面流程

```
WelcomePage ──→ TransferMethodPage ──→ PairingPage ──→ ScanPreviewPage ──→ TransferProgressPage ──→ CompletePage
                   │ (选外接存储时跳过配对)                                │
                   └──────────────────→ ScanPreviewPage ←─────────────────┘
```

### WelcomePage
- 两个大卡片："这是旧电脑 — 我要导出数据" / "这是新电脑 — 我要导入数据"
- 底部：语言切换、版本号

### TransferMethodPage
- 两选一卡片布局：
  - "WiFi / 局域网" — 配对码连接（推荐标签）
  - "外接存储" — U盘 / 移动硬盘

### PairingPage
- 旧电脑侧：大字号 6 位配对码，附带"请在新电脑输入此码"
- 新电脑侧：6 格数字输入框，自动聚焦

### ScanPreviewPage
- 左侧分类列表（文件 / 浏览器数据 / 应用配置 / 系统设置）
- 每项可勾选/取消，文件可展开浏览目录
- 右侧容量进度条 + 已选总大小
- 容量不足时红色警告，提供"智能推荐选择"按钮
- 底部"开始迁移"按钮

### TransferProgressPage
- 大进度条 + 百分比 + 当前文件名 + 速度 + 剩余时间
- 底部可折叠日志区

### CompletePage
- 成功动画 + 摘要统计（文件数、大小、耗时）
- 按钮：查看详情 / 完成

---

## 七、浏览器数据提取

| 数据 | 存储位置 (Chrome) | 格式 |
|------|-------------------|------|
| 书签 | `%LocalAppData%\Google\Chrome\User Data\Default\Bookmarks` | JSON 明文 |
| 密码 | `%LocalAppData%\Google\Chrome\User Data\Default\Login Data` | SQLite (DPAPI 加密) |
| 历史 | `%LocalAppData%\Google\Chrome\User Data\Default\History` | SQLite |
| 扩展 | `%LocalAppData%\Google\Chrome\User Data\Default\Extensions\` | 文件夹 |
| Cookie | `%LocalAppData%\Google\Chrome\User Data\Default\Network\Cookies` | SQLite |

### 密码迁移方案

Chrome 密码由 Windows DPAPI (`CryptProtectData`) 保护，与当前用户账户绑定，直接复制 SQLite 到新电脑无法解密。

处理流程：
1. 旧电脑 PS 脚本调用 `System.Security.Cryptography.ProtectedData.Unprotect` 解密
2. 用临时密钥（配对码 + 盐 → PBKDF2 → AES-256-GCM）重新加密
3. 打包进 `.pcmig` 传输
4. 新电脑 PS 脚本接收后先用临时密钥解密，再用新账户 DPAPI (`Protect`) 加密存储

### 支持的浏览器

Chrome、Edge、Firefox（三大主流浏览器）。其他 Chromium 内核浏览器可通过 Chrome 适配模式支持。

---

## 八、应用配置收集

### 配置路径已知（直接复制）

| 应用 | 配置路径 |
|------|----------|
| 微信 | `%Documents%\WeChat Files\` |
| QQ | `%Documents%\Tencent Files\` |
| Office | `%AppData%\Microsoft\Templates\`、`%AppData%\Microsoft\Office\` |
| 搜狗输入法 | `%LocalAppData%Low\SogouPY.users\` |
| VS Code | `%AppData%\Code\User\` |
| WPS | `%AppData%\Kingsoft\office6\` |

### 软件安装清单（提醒用户重装）

通过注册表扫描生成清单供新电脑参考：

- `HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\`
- `HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\`
- 64 位系统额外扫描 `HKLM\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\`
- 输出：应用名 + 版本 + 架构(x86/x64)

---

## 九、系统设置迁移

### 支持迁移

- 桌面壁纸 & 锁屏图片
- 任务栏固定图标布局
- 文件资源管理器偏好（显示隐藏文件/扩展名）
- 主题色 & 深色/浅色模式
- 鼠标/键盘设置
- 电源计划
- WiFi 密码（`netsh wlan export profile`）

### 不支持迁移（硬件相关，迁移会出问题）

- 显示分辨率 / 缩放比例
- 驱动程序相关配置
- 设备管理器配置

---

## 十、硬件 & 系统差异兼容

### 存储容量不匹配

- 扫描后根据目标磁盘容量自动计算"能否放下"
- 放不下时按优先级排序：系统设置 > 浏览器数据 > 应用配置 > 文件
- 文件内优先级：桌面 > 文档 > 图片 > 视频 > 下载
- UI 显示"已选 X GB / 目标可用 Y GB"容量进度条
- "智能推荐选择"按钮一键按优先级勾选到容量上限

### 路径差异

- manifest 所有路径以环境变量形式存储（`%UserProfile%`、`%LocalAppData%`），不使用绝对盘符
- 还原时自动解析到新电脑对应位置
- 非系统盘数据（如原 `D:\我的资料\`）提供"路径映射"让用户指定目标

### 32位 ↔ 64位

- 应用清单标注架构，提醒用户 32 位旧应用可能需替换
- 浏览器数据和文件不受影响

### 跨 Windows 版本

| 方向 | 策略 |
|------|------|
| Win10 → Win11 | 允许，系统设置做兼容过滤 |
| Win11 → Win10 | 允许，高版本特有设置标记"不兼容"跳过 |
| Win7 → Win11 | 允许，提示部分设置可能不兼容 |
| WinXP → WinXX | 不支持（无 PowerShell 5.1） |

### FAT32 存储设备

- 写入前检测文件系统
- FAT32 自动分包（`.pcmig.001` / `.002` / ...），每包 < 4GB
- 读取时自动识别合并

---

## 十一、错误处理 & 断点续传

### 传输中断恢复

| 场景 | 策略 |
|------|------|
| 网络断开 | 自动重连 3 次（间隔 2s/5s/10s），超阈值暂停，恢复后从断点继续 |
| U盘空间不足 | 打包前预检大小，不足则阻止开始；传输中拔出则暂停 |
| 新电脑离线 | 心跳超时 15s 自动暂停 |
| 进程崩溃 | 已传数据写 `.partial` 临时文件，重启后检测并提示继续 |

### 传输参数

- 分块大小：64MB
- 大文件流式打包，不一次性加载到内存
- 压缩策略：< 1MB 不压缩，≥ 1MB gzip 流式压缩
- 进度粒度：按块报告

### 文件冲突策略（用户可选）

1. **跳过同名文件**（默认）
2. **保留两者**（重命名为 `xxx(2).ext`）
3. **覆盖**（以旧电脑文件为准）

---

## 十二、安全设计

- 配对码：6 位数字，5 分钟有效期，使用随机算法生成
- 网络连接：TLS 1.3 WebSocket
- 敏感数据（密码等）：AES-256-GCM 加密，密钥由配对码 + 随机盐经 PBKDF2 派生
- 存储设备：`.pcmig` 内部加密，不信任存储介质
- 配对码不在磁盘上明文存储

---

## 十三、测试策略

| 层 | 工具 | 内容 |
|----|------|------|
| React 组件 | Vitest | 页面渲染、IPC mock |
| Electron 主进程 | Vitest | 打包/解包、配对逻辑、扫描调度 |
| PowerShell 脚本 | Pester | 每个 PS 脚本独立验证 |
| 集成测试 | 手动 + 脚本 | 完整流程：扫描→打包→传输→还原 |
| 场景测试 | 人工 | 硬件/系统差异场景矩阵 |

---

## 十四、不做的事情（明确的边界）

- 不迁移已安装的 .exe 程序本身（仅迁移配置 + 提供安装清单）
- 不迁移驱动程序
- 不迁移硬件相关设置（分辨率、设备管理器等）
- 不支持 Windows XP/Vista（无 PowerShell 5.1）
- 不做云中转传输（只用局域网或本机存储设备）
- v1 不做 Mac 支持（架构预留扩展点，PS 脚本层可替换为 bash）
