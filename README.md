# PC 迁移助手

一键完成 Windows 电脑换新时的数据迁移。支持文件、浏览器数据、应用配置和系统设置的完整迁移。

> 开源免费，替代 Laplink PCmover / EaseUS Todo PCTrans 等付费软件。

## 功能

- 用户文件迁移（桌面、文档、图片、视频、下载）
- 浏览器数据迁移（Chrome / Edge / Firefox 书签、密码、历史、扩展）
- 应用配置迁移（微信、QQ、Office、搜狗输入法、VS Code 等）
- 系统设置迁移（壁纸、主题、任务栏、WiFi 密码、电源计划等）
- 生成已安装软件清单供新电脑参考

## 传输方式

- **局域网直连**：通过 6 位配对码建立安全连接，同一 WiFi 下高速传输
- **外接存储**：导出 .pcmig 文件到 U 盘/移动硬盘，再导入新电脑

## 技术栈

| 层 | 技术 |
|----|------|
| 桌面壳 | Electron |
| UI 框架 | React + React Router |
| 构建工具 | Vite + TypeScript |
| 网络传输 | WebSocket + mDNS |
| 系统操作 | PowerShell 脚本 |
| 数据打包 | tar-stream + gzip |
| 加密 | AES-256-GCM + PBKDF2 |

## 快速开始

### 环境要求

- Windows 10 / 11
- Node.js 18+
- PowerShell 5.1（Windows 自带）

### 安装运行

```bash
# 克隆项目
git clone https://github.com/airhuang/pc-data-migration.git
cd pc-data-migration

# 安装依赖（首次约需 3-5 分钟，Electron 约 100MB）
npm install
npm install electron --save-dev

# 启动
npm run dev
```

### 打包

```bash
npm run package
```

## 项目结构

```
pc-data-migration/
├── electron/           # Electron 主进程
│   ├── main.ts         # 应用入口
│   ├── preload.ts      # IPC 桥接
│   ├── network/        # WebSocket 服务端/客户端、配对、mDNS
│   ├── storage/        # .pcmig 打包/解包、manifest、分片
│   ├── scanner/        # 文件扫描、预览构建
│   └── powershell/     # PS 脚本调度器
├── scripts/            # PowerShell 数据采集脚本
│   ├── browser/        # Chrome/Edge/Firefox 导出导入
│   ├── system/         # 系统设置导出导入
│   ├── apps/           # 应用配置导出
│   └── common/         # 公共工具函数
├── src/                # React 渲染进程
│   ├── pages/          # 6 个页面组件
│   └── components/     # 通用组件
└── tests/              # 单元测试
```

## 设计理念

- 三层架构：React UI → Electron 主进程 → PowerShell 脚本，边界清晰
- 每个 PowerShell 脚本单一职责，可独立运行和测试
- UI 通过 IPC 与主进程通信，主进程不直接操作 Windows API
- 统一 .pcmig 数据格式（tar.gz + manifest.json），局域网和存储设备共用

## License

MIT
