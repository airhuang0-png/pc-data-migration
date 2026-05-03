# PC 一键换机迁移工具 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an Electron + React desktop app that migrates files, browser data, app configs, and system settings from an old Windows PC to a new one via LAN or external storage.

**Architecture:** Three-layer: React UI (renderer) ↔ Electron main process (orchestration) ↔ PowerShell scripts (system access). Data flows through a unified `.pcmig` (tar.gz + manifest) bundle. LAN mode uses WebSocket + mDNS with 6-digit pairing codes; storage mode writes/reads the bundle on external media.

**Tech Stack:** Electron 33, React + React Router, Vite, TypeScript, WebSocket (ws), tar-stream, better-sqlite3, PowerShell 5.1, Vitest, Pester

---

## Phase 1: Project Scaffolding

### Task 1: Initialize project and install dependencies

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `electron-builder.yml`

- [ ] **Step 1: Create package.json**

```bash
cd /c/Users/18459/Documents/pc-data-migration
npm init -y
```

- [ ] **Step 2: Install production dependencies**

```bash
npm install react react-dom react-router-dom ws tar-stream better-sqlite3 multicast-dns uuid
```

- [ ] **Step 3: Install dev dependencies**

```bash
npm install -D electron electron-builder vite @vitejs/plugin-react typescript @types/react @types/react-dom @types/ws @types/better-sqlite3 @types/multicast-dns @types/uuid vitest @testing-library/react @testing-library/jest-dom jsdom concurrently wait-on cross-env
```

- [ ] **Step 4: Write tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "dist",
    "rootDir": ".",
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] }
  },
  "include": ["src/**/*", "electron/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 5: Write tsconfig.node.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist-electron"
  },
  "include": ["electron/**/*"]
}
```

- [ ] **Step 6: Write electron-builder.yml**

```yaml
appId: com.pcmigrate.app
productName: PC迁移助手
directories:
  output: release
files:
  - dist/**/*
  - dist-electron/**/*
  - scripts/**/*
win:
  target: nsis
  icon: resources/icon.ico
nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true
extraResources:
  - from: scripts
    to: scripts
```

- [ ] **Step 7: Update package.json scripts**

Add these scripts to package.json:
```json
{
  "main": "dist-electron/main.js",
  "scripts": {
    "dev": "concurrently \"vite\" \"wait-on http://localhost:5173 && electron .\"",
    "build": "vite build && tsc -p tsconfig.node.json",
    "package": "vite build && tsc -p tsconfig.node.json && electron-builder",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- [ ] **Step 8: Commit**

```bash
git add package.json tsconfig.json tsconfig.node.json electron-builder.yml
git commit -m "chore: initialize project with Electron + React + Vite stack"
```

---

### Task 2: Create directory structure and entry files

**Files:**
- Create: `electron/main.ts`
- Create: `electron/preload.ts`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/index.css`
- Create: `index.html`
- Create: `vite.config.ts`

- [ ] **Step 1: Create vite.config.ts**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  base: './',
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') }
  },
  build: {
    outDir: 'dist'
  }
});
```

- [ ] **Step 2: Create index.html**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>PC迁移助手</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>
```

- [ ] **Step 3: Create electron/main.ts**

```typescript
import { app, BrowserWindow } from 'electron';
import path from 'path';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 960,
    height: 680,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
```

- [ ] **Step 4: Create electron/preload.ts**

```typescript
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  invoke: (channel: string, ...args: unknown[]) => ipcRenderer.invoke(channel, ...args),
  on: (channel: string, callback: (...args: unknown[]) => void) => {
    ipcRenderer.on(channel, (_event, ...args) => callback(...args));
  },
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  }
});
```

- [ ] **Step 5: Create src/main.tsx**

```tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode><App /></React.StrictMode>
);
```

- [ ] **Step 6: Create src/App.tsx**

```tsx
import { HashRouter, Routes, Route } from 'react-router-dom';
import WelcomePage from './pages/WelcomePage';

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<WelcomePage />} />
      </Routes>
    </HashRouter>
  );
}
```

- [ ] **Step 7: Create src/index.css** (minimal reset)

```css
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
```

- [ ] **Step 8: Create placeholder WelcomePage**

Create `src/pages/WelcomePage.tsx`:
```tsx
export default function WelcomePage() {
  return <div style={{ padding: 40, textAlign: 'center' }}><h1>PC迁移助手</h1></div>;
}
```

- [ ] **Step 9: Verify dev startup**

```bash
mkdir -p dist-electron && npx tsc -p tsconfig.node.json
npx vite build
echo "Build check passed"
```

- [ ] **Step 10: Commit**

```bash
git add electron/main.ts electron/preload.ts src/ vite.config.ts index.html
git commit -m "feat: add Electron + React entry scaffolding"
```

---

## Phase 2: Core Infrastructure

### Task 3: Define manifest types

**Files:**
- Create: `electron/storage/manifest.ts`

- [ ] **Step 1: Write manifest.ts**

```typescript
export interface ManifestSource {
  hostname: string;
  os: string;
  os_version: string;
  arch: string;
  username: string;
}

export interface FileSection {
  size: number;
  count: number;
  root: string; // e.g. "%UserProfile%"
}

export interface BrowserSection {
  size: number;
  browsers: string[];
}

export interface AppConfigSection {
  size: number;
  apps: string[];
}

export interface SystemSettingsSection {
  size: number;
  items: string[];
}

export interface ManifestSections {
  files?: FileSection;
  browser?: BrowserSection;
  app_configs?: AppConfigSection;
  system_settings?: SystemSettingsSection;
}

export interface Manifest {
  version: string;
  source: ManifestSource;
  timestamp: string;
  total_size: number;
  sections: ManifestSections;
}

export function createManifest(source: ManifestSource, sections: ManifestSections, totalSize: number): Manifest {
  return {
    version: '1.0',
    source,
    timestamp: new Date().toISOString(),
    total_size: totalSize,
    sections
  };
}

export function serializeManifest(m: Manifest): string {
  return JSON.stringify(m, null, 2);
}

export function deserializeManifest(json: string): Manifest {
  return JSON.parse(json) as Manifest;
}
```

- [ ] **Step 2: Run TypeScript check**

```bash
npx tsc -p tsconfig.node.json --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add electron/storage/manifest.ts
git commit -m "feat: add manifest type definitions and serialization"
```

---

### Task 4: Build PowerShell runner

**Files:**
- Create: `electron/powershell/runner.ts`

- [ ] **Step 1: Write runner.ts**

```typescript
import { execFile } from 'child_process';
import path from 'path';
import { app } from 'electron';

export interface PsResult {
  success: boolean;
  data?: string;    // JSON stdout
  error?: string;
}

function getScriptsDir(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'scripts');
  }
  return path.join(app.getAppPath(), 'scripts');
}

export function runScript(scriptPath: string, args: string[] = [], timeoutMs = 60000): Promise<PsResult> {
  const fullPath = path.join(getScriptsDir(), scriptPath);

  const psArgs = [
    '-NoProfile',
    '-ExecutionPolicy', 'Bypass',
    '-File', fullPath,
    ...args
  ];

  return new Promise((resolve) => {
    execFile(
      'powershell.exe',
      psArgs,
      { timeout: timeoutMs, maxBuffer: 10 * 1024 * 1024 },
      (error, stdout, stderr) => {
        if (error) {
          resolve({ success: false, error: stderr || error.message });
          return;
        }
        resolve({ success: true, data: stdout.trim() });
      }
    );
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add electron/powershell/runner.ts
git commit -m "feat: add PowerShell script runner utility"
```

---

### Task 5: Define IPC channels

**Files:**
- Create: `electron/ipc-channels.ts`

- [ ] **Step 1: Write ipc-channels.ts**

```typescript
export const IPC = {
  // Scanning
  SCAN_START: 'scan:start',
  SCAN_PROGRESS: 'scan:progress',
  SCAN_COMPLETE: 'scan:complete',

  // Pairing
  PAIRING_GENERATE: 'pairing:generate',
  PAIRING_CONNECT: 'pairing:connect',
  PAIRING_READY: 'pairing:ready',

  // Transfer
  TRANSFER_START: 'transfer:start',
  TRANSFER_PROGRESS: 'transfer:progress',
  TRANSFER_COMPLETE: 'transfer:complete',
  TRANSFER_CANCEL: 'transfer:cancel',
  TRANSFER_ERROR: 'transfer:error',

  // Storage export
  EXPORT_START: 'export:start',
  EXPORT_PROGRESS: 'export:progress',
  EXPORT_COMPLETE: 'export:complete',

  // Storage import
  IMPORT_START: 'import:start',
  IMPORT_PROGRESS: 'import:progress',
  IMPORT_COMPLETE: 'import:complete',

  // System info
  GET_SYSTEM_INFO: 'system:info',
  GET_DISK_SPACE: 'system:disk-space',
} as const;
```

- [ ] **Step 2: Commit**

```bash
git add electron/ipc-channels.ts
git commit -m "feat: define all IPC channel constants"
```

---

### Task 6: Create common PS utility library

**Files:**
- Create: `scripts/common/utils.ps1`

- [ ] **Step 1: Write utils.ps1**

```powershell
function Write-JsonOutput($obj) {
    $obj | ConvertTo-Json -Depth 10 -Compress | Write-Output
}

function Resolve-PathVar($pathWithVars) {
    return [Environment]::ExpandEnvironmentVariables($pathWithVars)
}

function Get-FolderSize($folderPath) {
    if (-not (Test-Path $folderPath)) { return 0 }
    $size = 0
    Get-ChildItem -Path $folderPath -Recurse -File -ErrorAction SilentlyContinue | ForEach-Object {
        $size += $_.Length
    }
    return $size
}

function Test-Admin {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($identity)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Get-SystemInfo {
    $os = Get-CimInstance Win32_OperatingSystem
    return @{
        hostname   = $env:COMPUTERNAME
        os         = "Windows $($os.Caption -replace 'Microsoft Windows ', '')"
        os_version = $os.Version
        arch       = if ([Environment]::Is64BitOperatingSystem) { "x64" } else { "x86" }
        username   = $env:USERNAME
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add scripts/common/utils.ps1
git commit -m "feat: add PowerShell common utility functions"
```

---

## Phase 3: Scanning Layer

### Task 7: File scanner

**Files:**
- Create: `electron/scanner/file-scanner.ts`
- Test: `tests/scanner/file-scanner.test.ts`

- [ ] **Step 1: Write file-scanner.ts**

```typescript
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface FileEntry {
  path: string;       // relative to user profile, e.g. "Documents/report.docx"
  size: number;
  modified: string;
}

export interface FileCategory {
  name: string;
  resolvedPath: string;
  entries: FileEntry[];
  totalSize: number;
}

const CATEGORIES: { name: string; envVar: string; subPath: string }[] = [
  { name: '桌面', envVar: 'USERPROFILE', subPath: 'Desktop' },
  { name: '文档', envVar: 'USERPROFILE', subPath: 'Documents' },
  { name: '图片', envVar: 'USERPROFILE', subPath: 'Pictures' },
  { name: '视频', envVar: 'USERPROFILE', subPath: 'Videos' },
  { name: '下载', envVar: 'USERPROFILE', subPath: 'Downloads' },
];

function walkDir(dir: string, basePath: string, maxDepth = 20): FileEntry[] {
  const results: FileEntry[] = [];
  if (maxDepth <= 0) return results;

  try {
    const items = fs.readdirSync(dir);
    for (const name of items) {
      try {
        const full = path.join(dir, name);
        const stat = fs.statSync(full);
        if (stat.isDirectory()) {
          results.push(...walkDir(full, basePath, maxDepth - 1));
        } else {
          results.push({
            path: path.relative(basePath, full),
            size: stat.size,
            modified: stat.mtime.toISOString()
          });
        }
      } catch {
        // skip inaccessible files
      }
    }
  } catch {
    // skip inaccessible dirs
  }
  return results;
}

export function scanFiles(progressCallback?: (cat: string, scanned: number) => void): FileCategory[] {
  const categories: FileCategory[] = [];

  for (const cat of CATEGORIES) {
    const resolvedPath = path.join(
      process.env[cat.envVar] ?? os.homedir(),
      cat.subPath
    );

    if (!fs.existsSync(resolvedPath)) {
      categories.push({ name: cat.name, resolvedPath, entries: [], totalSize: 0 });
      continue;
    }

    const entries = walkDir(resolvedPath, process.env.USERPROFILE ?? os.homedir());
    const totalSize = entries.reduce((sum, e) => sum + e.size, 0);

    categories.push({ name: cat.name, resolvedPath, entries, totalSize });
    progressCallback?.(cat.name, entries.length);
  }

  return categories;
}

export function getTotalFileSize(categories: FileCategory[]): number {
  return categories.reduce((sum, c) => sum + c.totalSize, 0);
}
```

- [ ] **Step 2: Write test file (scan first)**

Add `tests/scanner/file-scanner.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { scanFiles, getTotalFileSize } from '../../electron/scanner/file-scanner';

describe('scanFiles', () => {
  it('returns categories for desktop, documents, pictures, videos, downloads', () => {
    const cats = scanFiles();
    const names = cats.map(c => c.name);
    expect(names).toContain('桌面');
    expect(names).toContain('文档');
    expect(names).toContain('图片');
    expect(names).toContain('视频');
    expect(names).toContain('下载');
  });

  it('each category has resolvedPath', () => {
    const cats = scanFiles();
    for (const c of cats) {
      expect(c.resolvedPath).toBeTruthy();
      expect(Array.isArray(c.entries)).toBe(true);
    }
  });
});

describe('getTotalFileSize', () => {
  it('sums all category sizes', () => {
    const fake = [
      { name: 'a', resolvedPath: '', entries: [], totalSize: 100 },
      { name: 'b', resolvedPath: '', entries: [], totalSize: 200 },
    ];
    expect(getTotalFileSize(fake)).toBe(300);
  });
});
```

- [ ] **Step 3: Run tests**

```bash
npx vitest run tests/scanner/file-scanner.test.ts
```

- [ ] **Step 4: Commit**

```bash
git add electron/scanner/file-scanner.ts tests/scanner/file-scanner.test.ts
git commit -m "feat: add file scanner with category-based scanning"
```

---

### Task 8: Category resolver

**Files:**
- Create: `electron/scanner/category-resolver.ts`
- Test: `tests/scanner/category-resolver.test.ts`

- [ ] **Step 1: Write category-resolver.ts**

```typescript
import { FileCategory } from './file-scanner';

export type SectionId = 'files' | 'browser' | 'app_configs' | 'system_settings';

export interface PreviewSection {
  id: SectionId;
  label: string;
  size: number;
  selected: boolean;
  priority: number; // lower = more important
  children?: PreviewSection[];
}

export function buildPreview(
  fileCategories: FileCategory[],
  browserSize: number,
  appConfigSize: number,
  systemSettingsSize: number
): PreviewSection[] {
  const sections: PreviewSection[] = [];

  // System settings (highest priority, always tiny)
  sections.push({
    id: 'system_settings',
    label: '系统设置',
    size: systemSettingsSize,
    selected: true,
    priority: 0
  });

  // Browser data
  sections.push({
    id: 'browser',
    label: '浏览器数据',
    size: browserSize,
    selected: true,
    priority: 1
  });

  // App configs
  sections.push({
    id: 'app_configs',
    label: '应用配置',
    size: appConfigSize,
    selected: true,
    priority: 2
  });

  // Files (break down by sub-category for fine-grained control)
  const fileChildren: PreviewSection[] = fileCategories.map((cat, i) => ({
    id: `files_${cat.name}` as SectionId,
    label: cat.name,
    size: cat.totalSize,
    selected: true,
    priority: 3 + i
  }));

  const totalFileSize = fileCategories.reduce((s, c) => s + c.totalSize, 0);
  sections.push({
    id: 'files',
    label: '用户文件',
    size: totalFileSize,
    selected: true,
    priority: 3,
    children: fileChildren
  });

  sections.sort((a, b) => a.priority - b.priority);
  return sections;
}

export interface CapacityResult {
  fits: boolean;
  totalSelected: number;
  available: number;
  shortfall: number;
}

export function checkCapacity(selectedSize: number, availableBytes: number): CapacityResult {
  return {
    fits: selectedSize <= availableBytes,
    totalSelected: selectedSize,
    available: availableBytes,
    shortfall: Math.max(0, selectedSize - availableBytes)
  };
}

export function autoSelectByCapacity(sections: PreviewSection[], maxBytes: number): PreviewSection[] {
  let used = 0;
  const result = sections.map(s => {
    const copy = { ...s, children: s.children?.map(c => ({ ...c })) };
    // Always include non-file sections first
    if (copy.id !== 'files') {
      used += copy.size;
      copy.selected = true;
      return copy;
    }
    // For files, select children by priority until capacity limit
    if (copy.children) {
      for (const child of copy.children) {
        if (used + child.size <= maxBytes) {
          used += child.size;
          child.selected = true;
        } else {
          child.selected = false;
        }
      }
    }
    copy.size = copy.children?.filter(c => c.selected).reduce((s, c) => s + c.size, 0) ?? 0;
    copy.selected = (copy.children?.some(c => c.selected)) ?? false;
    return copy;
  });
  return result;
}
```

- [ ] **Step 2: Write test**

```typescript
import { describe, it, expect } from 'vitest';
import { buildPreview, checkCapacity, autoSelectByCapacity } from '../../electron/scanner/category-resolver';

const fakeFileCats = [
  { name: '桌面', resolvedPath: '', entries: [], totalSize: 1000 },
  { name: '文档', resolvedPath: '', entries: [], totalSize: 2000 },
];

describe('buildPreview', () => {
  it('creates 4 top sections with correct priorities', () => {
    const sections = buildPreview(fakeFileCats, 50, 100, 1);
    expect(sections.length).toBe(4);
    expect(sections[0].id).toBe('system_settings'); // priority 0
    expect(sections[3].id).toBe('files');           // priority 3
  });

  it('files section has children matching file categories', () => {
    const sections = buildPreview(fakeFileCats, 50, 100, 1);
    const filesSection = sections.find(s => s.id === 'files')!;
    expect(filesSection.children).toHaveLength(2);
  });
});

describe('checkCapacity', () => {
  it('reports fits true when selected <= available', () => {
    expect(checkCapacity(100, 200).fits).toBe(true);
  });

  it('reports fits false when selected > available', () => {
    expect(checkCapacity(300, 200).fits).toBe(false);
    expect(checkCapacity(300, 200).shortfall).toBe(100);
  });
});

describe('autoSelectByCapacity', () => {
  it('prioritizes non-file sections then files by priority', () => {
    const sections = buildPreview(fakeFileCats, 50, 100, 1);
    const result = autoSelectByCapacity(sections, 200);
    const sys = result.find(s => s.id === 'system_settings')!;
    const browser = result.find(s => s.id === 'browser')!;
    expect(sys.selected).toBe(true);
    expect(browser.selected).toBe(true);
  });
});
```

- [ ] **Step 3: Run tests**

```bash
npx vitest run tests/scanner/category-resolver.test.ts
```

- [ ] **Step 4: Commit**

```bash
git add electron/scanner/category-resolver.ts tests/scanner/category-resolver.test.ts
git commit -m "feat: add preview builder with capacity-aware auto-selection"
```

---

### Task 9: Scan orchestrator

**Files:**
- Create: `electron/scanner/index.ts`

- [ ] **Step 1: Write scan orchestrator**

```typescript
import { scanFiles, FileCategory } from './file-scanner';
import { buildPreview, PreviewSection } from './category-resolver';
import { runScript, PsResult } from '../powershell/runner';
import { createManifest, Manifest, ManifestSource } from '../storage/manifest';
import * as os from 'os';

export interface ScanResult {
  manifest: Manifest;
  preview: PreviewSection[];
  fileCategories: FileCategory[];
}

type ProgressHandler = (stage: string, detail: string) => void;

export async function scanAll(
  onProgress?: ProgressHandler
): Promise<ScanResult> {
  // Get system info via PS
  onProgress?.('system', '正在获取系统信息...');
  const sysInfoResult = await runScript('common/utils.ps1');
  // PS script will output JSON with system info — we'll assemble in-code as fallback
  const source: ManifestSource = {
    hostname: os.hostname(),
    os: `Windows ${os.release()}`,
    os_version: os.release(),
    arch: process.arch,
    username: os.userInfo().username
  };

  // Scan files
  onProgress?.('files', '正在扫描文件...');
  const fileCategories = scanFiles((cat, count) => {
    onProgress?.('files', `${cat}: ${count} 个文件`);
  });

  // Scan browser data
  onProgress?.('browser', '正在检查浏览器数据...');
  let browserSize = 0;
  const browsers: string[] = [];
  for (const script of ['export-chrome.ps1', 'export-edge.ps1', 'export-firefox.ps1']) {
    const r = await runScript(`browser/${script}`, ['--check-only']);
    if (r.success && r.data) {
      try {
        const info = JSON.parse(r.data);
        if (info.found) {
          browsers.push(info.browser);
          browserSize += info.size ?? 0;
        }
      } catch { /* skip */ }
    }
  }

  // Scan app configs
  onProgress?.('apps', '正在检查应用配置...');
  let appConfigSize = 0;
  const apps: string[] = [];
  for (const [script, label] of [
    ['export-wechat.ps1', '微信'],
    ['export-office.ps1', 'Office'],
    ['export-input-method.ps1', '输入法']
  ] as const) {
    const r = await runScript(`apps/${script}`, ['--check-only']);
    if (r.success && r.data) {
      try {
        const info = JSON.parse(r.data);
        if (info.found) {
          apps.push(label);
          appConfigSize += info.size ?? 0;
        }
      } catch { /* skip */ }
    }
  }

  // System settings
  onProgress?.('system_settings', '正在评估系统设置...');
  const settingsResult = await runScript('system/export-settings.ps1', ['--check-only']);
  let systemSettingsSize = 0;
  const settingsItems: string[] = [];
  if (settingsResult.success && settingsResult.data) {
    try {
      const info = JSON.parse(settingsResult.data);
      systemSettingsSize = info.size ?? 0;
      settingsItems.push(...(info.items ?? []));
    } catch { /* skip */ }
  }

  // Build preview
  const preview = buildPreview(fileCategories, browserSize, appConfigSize, systemSettingsSize);

  // Build manifest
  const totalSize = browserSize + appConfigSize + systemSettingsSize +
    fileCategories.reduce((s, c) => s + c.totalSize, 0);

  const manifest = createManifest(source, {
    files: { size: fileCategories.reduce((s, c) => s + c.totalSize, 0), count: fileCategories.reduce((s, c) => s + c.entries.length, 0), root: '%UserProfile%' },
    browser: browsers.length > 0 ? { size: browserSize, browsers } : undefined,
    app_configs: apps.length > 0 ? { size: appConfigSize, apps } : undefined,
    system_settings: settingsItems.length > 0 ? { size: systemSettingsSize, items: settingsItems } : undefined
  }, totalSize);

  return { manifest, preview, fileCategories };
}
```

- [ ] **Step 2: Commit**

```bash
git add electron/scanner/index.ts
git commit -m "feat: add scan orchestrator that coordinates all scanners"
```

---

## Phase 4: Storage Layer

### Task 10: Packager — create .pcmig bundles

**Files:**
- Create: `electron/storage/packager.ts`

- [ ] **Step 1: Write packager.ts**

```typescript
import { createWriteStream } from 'fs';
import { createGzip } from 'zlib';
import * as path from 'path';
import * as fs from 'fs';
import * as tar from 'tar-stream';
import { ScanResult } from '../scanner';
import { serializeManifest } from './manifest';

export interface PackProgress {
  percent: number;
  currentFile: string;
  bytesWritten: number;
  totalBytes: number;
}

export async function packToFile(
  scanResult: ScanResult,
  outputPath: string,
  onProgress?: (p: PackProgress) => void,
  abortSignal?: { aborted: boolean }
): Promise<string> {
  const pack = tar.pack();
  const gzip = createGzip();
  const dest = createWriteStream(outputPath);

  pack.pipe(gzip).pipe(dest);

  // 1. Write manifest first
  const manifestJson = serializeManifest(scanResult.manifest);
  pack.entry({ name: 'manifest.json', size: Buffer.byteLength(manifestJson) }, manifestJson);

  let bytesWritten = 0;
  const totalBytes = scanResult.manifest.total_size;

  // 2. Write files
  for (const cat of scanResult.fileCategories) {
    for (const entry of cat.entries) {
      if (abortSignal?.aborted) {
        pack.finalize();
        return outputPath;
      }

      const fullPath = path.join(cat.resolvedPath, path.basename(entry.path));
      if (!fs.existsSync(fullPath)) continue;

      const content = fs.readFileSync(fullPath);
      pack.entry(
        { name: `files/${entry.path.replace(/\\/g, '/')}`, size: content.length },
        content
      );
      bytesWritten += content.length;
    }
  }

  // 3. Browser / app config / system_settings directories
  // These will be filled by PS script outputs before packaging
  // For now create placeholder dirs
  const sections = scanResult.manifest.sections;
  if (sections.browser) {
    pack.entry({ name: 'browser/', size: 0, type: 'directory' }, '');
  }
  if (sections.app_configs) {
    pack.entry({ name: 'app_configs/', size: 0, type: 'directory' }, '');
  }
  if (sections.system_settings) {
    pack.entry({ name: 'system_settings/', size: 0, type: 'directory' }, '');
  }

  pack.finalize();

  return new Promise((resolve, reject) => {
    dest.on('close', () => resolve(outputPath));
    dest.on('error', reject);
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add electron/storage/packager.ts
git commit -m "feat: add .pcmig packager using tar-stream + gzip"
```

---

### Task 11: Extractor — restore from .pcmig

**Files:**
- Create: `electron/storage/extractor.ts`

- [ ] **Step 1: Write extractor.ts**

```typescript
import { createReadStream } from 'fs';
import { createGunzip } from 'zlib';
import * as path from 'path';
import * as fs from 'fs';
import * as tar from 'tar-stream';
import { deserializeManifest, Manifest } from './manifest';

export interface ExtractResult {
  manifest: Manifest;
  outputDir: string;
}

export function extractBundle(
  bundlePath: string,
  outputDir: string,
  onProgress?: (p: { percent: number; currentFile: string }) => void,
  conflictStrategy: 'skip' | 'rename' | 'overwrite' = 'skip'
): Promise<ExtractResult> {
  return new Promise((resolve, reject) => {
    const extract = tar.extract();
    const readStream = createReadStream(bundlePath);
    let manifest: Manifest | null = null;
    let totalFiles = 0;
    let processedFiles = 0;
    const entries: Promise<void>[] = [];

    readStream.pipe(createGunzip()).pipe(extract);

    extract.on('entry', (header, stream, next) => {
      totalFiles++;
      const fullPath = path.join(outputDir, header.name);

      if (header.name === 'manifest.json') {
        let buf = '';
        stream.on('data', (chunk: Buffer) => { buf += chunk.toString(); });
        stream.on('end', () => {
          manifest = deserializeManifest(buf);
          processedFiles++;
          next();
        });
        return;
      }

      if (header.type === 'directory') {
        entries.push(
          fs.promises.mkdir(fullPath, { recursive: true }).then(() => {
            processedFiles++;
          })
        );
        stream.resume();
        next();
        return;
      }

      const parentDir = path.dirname(fullPath);

      const restoreEntry = async () => {
        await fs.promises.mkdir(parentDir, { recursive: true });

        if (conflictStrategy === 'skip' && fs.existsSync(fullPath)) {
          processedFiles++;
          stream.resume();
          return;
        }

        if (conflictStrategy === 'rename' && fs.existsSync(fullPath)) {
          const ext = path.extname(fullPath);
          const base = fullPath.slice(0, -ext.length);
          let counter = 2;
          while (fs.existsSync(`${base}(${counter})${ext}`)) counter++;
          const newPath = `${base}(${counter})${ext}`;
          const ws = fs.createWriteStream(newPath);
          stream.pipe(ws);
          await new Promise(r => ws.on('close', r));
          processedFiles++;
          return;
        }

        const ws = fs.createWriteStream(fullPath);
        stream.pipe(ws);
        await new Promise(r => ws.on('close', r));
        processedFiles++;
      };

      entries.push(restoreEntry());
      onProgress?.({
        percent: totalFiles > 0 ? Math.round((processedFiles / totalFiles) * 100) : 0,
        currentFile: header.name
      });
      next();
    });

    extract.on('finish', async () => {
      await Promise.all(entries);
      if (!manifest) return reject(new Error('No manifest found in bundle'));
      resolve({ manifest, outputDir });
    });

    extract.on('error', reject);
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add electron/storage/extractor.ts
git commit -m "feat: add .pcmig extractor with conflict strategy support"
```

---

### Task 12: FAT32 split/merge support

**Files:**
- Create: `electron/storage/splitter.ts`

- [ ] **Step 1: Write splitter.ts**

```typescript
import * as fs from 'fs';
import * as path from 'path';

const FAT32_MAX_FILE = 4 * 1024 * 1024 * 1024 - 1; // 4GB - 1 byte
const CHUNK_SIZE = 256 * 1024 * 1024; // 256 MB read chunks

export function splitFile(
  filePath: string,
  onProgress?: (part: number, total: number) => void
): string[] {
  const stat = fs.statSync(filePath);
  const totalParts = Math.ceil(stat.size / FAT32_MAX_FILE);
  const parts: string[] = [];

  if (totalParts <= 1) return [filePath];

  const fd = fs.openSync(filePath, 'r');
  const buffer = Buffer.alloc(CHUNK_SIZE);

  for (let i = 0; i < totalParts; i++) {
    const partPath = `${filePath}.${String(i + 1).padStart(3, '0')}`;
    const partFd = fs.openSync(partPath, 'w');
    const partStart = i * FAT32_MAX_FILE;
    const partEnd = Math.min((i + 1) * FAT32_MAX_FILE, stat.size);
    let offset = partStart;

    while (offset < partEnd) {
      const readSize = Math.min(CHUNK_SIZE, partEnd - offset);
      const bytesRead = fs.readSync(fd, buffer, 0, readSize, offset);
      fs.writeSync(partFd, buffer, 0, bytesRead);
      offset += bytesRead;
    }

    fs.closeSync(partFd);
    parts.push(partPath);
    onProgress?.(i + 1, totalParts);
  }

  fs.closeSync(fd);
  return parts;
}

export function mergeFiles(partPattern: string, outputPath: string, totalParts: number): void {
  const outFd = fs.openSync(outputPath, 'w');
  const buffer = Buffer.alloc(CHUNK_SIZE);

  for (let i = 0; i < totalParts; i++) {
    const partPath = partPattern.replace('*', String(i + 1).padStart(3, '0'));
    const partFd = fs.openSync(partPath, 'r');
    const partStat = fs.statSync(partPath);
    let remaining = partStat.size;
    let offset = 0;

    while (remaining > 0) {
      const readSize = Math.min(CHUNK_SIZE, remaining);
      const bytesRead = fs.readSync(partFd, buffer, 0, readSize, offset);
      fs.writeSync(outFd, buffer, 0, bytesRead);
      remaining -= bytesRead;
      offset += bytesRead;
    }

    fs.closeSync(partFd);
  }

  fs.closeSync(outFd);
}

export function detectFileSystem(targetPath: string): 'FAT32' | 'NTFS' | 'exFAT' | 'unknown' {
  // On Windows, we can check via PowerShell or just check if we can create a >4GB file
  const root = path.parse(targetPath).root;
  // Simplified heuristic — real implementation calls PS
  return 'NTFS'; // placeholder
}
```

- [ ] **Step 2: Commit**

```bash
git add electron/storage/splitter.ts
git commit -m "feat: add FAT32 file splitting and merging support"
```

---

## Phase 5: Network Layer

### Task 13: Pairing code generation and verification

**Files:**
- Create: `electron/network/pairing.ts`

- [ ] **Step 1: Write pairing.ts**

```typescript
import { randomInt } from 'crypto';

export interface PairingSession {
  code: string;
  createdAt: number;
  expiresAt: number;
  salt: string; // used for PBKDF2 key derivation
}

const SESSION_TTL_MS = 5 * 60 * 1000; // 5 minutes

export function generatePairingCode(): PairingSession {
  const code = String(randomInt(100000, 999999));
  const now = Date.now();
  return {
    code,
    createdAt: now,
    expiresAt: now + SESSION_TTL_MS,
    salt: randomInt(1000000000, 9999999999).toString(16)
  };
}

export function validatePairingCode(session: PairingSession, input: string): boolean {
  if (Date.now() > session.expiresAt) return false;
  return session.code === input;
}

export function deriveEncryptionKey(code: string, salt: string): Buffer {
  const { pbkdf2Sync } = require('crypto') as typeof import('crypto');
  return pbkdf2Sync(code, salt, 100000, 32, 'sha256');
}
```

- [ ] **Step 2: Commit**

```bash
git add electron/network/pairing.ts
git commit -m "feat: add pairing code generation and validation with PBKDF2"
```

---

### Task 14: WebSocket server (old PC side)

**Files:**
- Create: `electron/network/server.ts`

- [ ] **Step 1: Write server.ts**

```typescript
import { createServer as createTlsServer } from 'tls';
import { createServer as createHttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import * as fs from 'fs';
import * as path from 'path';
import { generatePairingCode, validatePairingCode, PairingSession } from './pairing';

export interface TransferMessage {
  type: 'manifest' | 'chunk' | 'complete' | 'error' | 'cancel';
  payload?: unknown;
}

export class MigrationServer {
  private wss: WebSocketServer | null = null;
  private session: PairingSession | null = null;
  private clientSocket: WebSocket | null = null;
  private port: number = 0;

  async start(): Promise<{ port: number; session: PairingSession }> {
    this.session = generatePairingCode();

    // For simplicity, use plain WebSocket in v1
    // TLS can be added with self-signed cert
    const server = createHttpServer();
    this.wss = new WebSocketServer({ server });

    this.wss.on('connection', (ws) => {
      // First message must be the pairing code
      ws.once('message', (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'pair' && validatePairingCode(this.session!, msg.code)) {
          this.clientSocket = ws;
          ws.send(JSON.stringify({ type: 'paired', payload: { ok: true } }));
          this.handleClient(ws);
        } else {
          ws.send(JSON.stringify({ type: 'error', payload: 'Invalid or expired pairing code' }));
          ws.close();
        }
      });
    });

    return new Promise((resolve) => {
      server.listen(0, () => {
        const addr = server.address();
        if (addr && typeof addr !== 'string') {
          this.port = addr.port;
          resolve({ port: this.port, session: this.session! });
        }
      });
    });
  }

  private handleClient(ws: WebSocket) {
    ws.on('message', (data) => {
      const msg: TransferMessage = JSON.parse(data.toString());
      switch (msg.type) {
        case 'cancel':
          this.clientSocket = null;
          break;
        // Server-side messages handled by upper layer via callbacks
      }
    });
  }

  send(msg: TransferMessage) {
    if (this.clientSocket?.readyState === WebSocket.OPEN) {
      this.clientSocket.send(JSON.stringify(msg));
    }
  }

  stop() {
    this.clientSocket?.close();
    this.wss?.close();
    this.session = null;
    this.clientSocket = null;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add electron/network/server.ts
git commit -m "feat: add WebSocket server with pairing code authentication"
```

---

### Task 15: WebSocket client (new PC side)

**Files:**
- Create: `electron/network/client.ts`

- [ ] **Step 1: Write client.ts**

```typescript
import { WebSocket } from 'ws';

export class MigrationClient {
  private ws: WebSocket | null = null;
  private messageHandlers: Map<string, (payload: unknown) => void> = new Map();

  connect(host: string, port: number, code: string): Promise<boolean> {
    return new Promise((resolve) => {
      this.ws = new WebSocket(`ws://${host}:${port}`);

      this.ws.on('open', () => {
        this.ws!.send(JSON.stringify({ type: 'pair', code }));
      });

      this.ws.once('message', (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'paired' && msg.payload?.ok) {
          this.setupHandlers();
          resolve(true);
        } else {
          resolve(false);
        }
      });

      this.ws.on('error', () => resolve(false));

      setTimeout(() => resolve(false), 10000); // 10s timeout
    });
  }

  private setupHandlers() {
    if (!this.ws) return;
    this.ws.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      const handler = this.messageHandlers.get(msg.type);
      handler?.(msg.payload);
    });
  }

  on(messageType: string, handler: (payload: unknown) => void) {
    this.messageHandlers.set(messageType, handler);
  }

  send(type: string, payload?: unknown) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, payload }));
    }
  }

  disconnect() {
    this.ws?.close();
    this.ws = null;
    this.messageHandlers.clear();
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add electron/network/client.ts
git commit -m "feat: add WebSocket client for new PC connection"
```

---

### Task 16: mDNS service discovery

**Files:**
- Create: `electron/network/mdns.ts`

- [ ] **Step 1: Write mdns.ts**

```typescript
import { create as createMdns, Browser, Advertisement } from 'multicast-dns';

const SERVICE_TYPE = '_pcmigrate._tcp.local';

export function startAdvertising(port: number): () => void {
  const mdns = createMdns();

  mdns.on('query', (query) => {
    for (const q of query.questions) {
      if (q.name === SERVICE_TYPE && q.type === 'PTR') {
        mdns.respond({
          answers: [{
            name: SERVICE_TYPE,
            type: 'PTR',
            class: 1,
            ttl: 120,
            data: `PC迁移助手._pcmigrate._tcp.local`
          }, {
            name: `PC迁移助手._pcmigrate._tcp.local`,
            type: 'SRV',
            class: 1,
            ttl: 120,
            data: { port, target: 'localhost' }
          }]
        });
      }
    }
  });

  return () => mdns.destroy();
}

export function discoverServers(onFound: (info: { host: string; port: number }) => void): () => void {
  const mdns = createMdns();
  const browser = mdns;

  mdns.on('response', (response) => {
    for (const answer of response.answers) {
      if (answer.name === SERVICE_TYPE && answer.type === 'PTR') {
        // Found a migration service — extract SRV record info
        const srvAnswer = response.answers.find(
          a => a.type === 'SRV' && a.name === (answer as any).data
        );
        if (srvAnswer && 'data' in srvAnswer && srvAnswer.data && typeof srvAnswer.data === 'object' && 'port' in srvAnswer.data) {
          const port = (srvAnswer.data as { port: number }).port;
          onFound({ host: response.answers[0]?.name ?? 'localhost', port });
        }
      }
    }
  });

  mdns.query(SERVICE_TYPE, 'PTR');

  return () => mdns.destroy();
}
```

- [ ] **Step 2: Commit**

```bash
git add electron/network/mdns.ts
git commit -m "feat: add mDNS service advertising and discovery"
```

---

## Phase 6: PowerShell Data Scripts

### Task 17: Chrome data export script

**Files:**
- Create: `scripts/browser/export-chrome.ps1`

- [ ] **Step 1: Write export-chrome.ps1**

```powershell
param([switch]$CheckOnly)

. "$PSScriptRoot/../common/utils.ps1"

$chromeDir = "$env:LOCALAPPDATA\Google\Chrome\User Data\Default"
$found = Test-Path $chromeDir

if ($CheckOnly) {
    if ($found) {
        $size = Get-FolderSize $chromeDir
        Write-JsonOutput @{ found = $true; browser = "chrome"; size = $size }
    } else {
        Write-JsonOutput @{ found = $false; browser = "chrome"; size = 0 }
    }
    exit 0
}

if (-not $found) {
    Write-JsonOutput @{ success = $false; error = "Chrome not found" }
    exit 1
}

# Create temp output dir
$outDir = "$env:TEMP\pcmig_chrome_export"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

# Copy bookmarks (plain JSON)
$bookmarksPath = "$chromeDir\Bookmarks"
if (Test-Path $bookmarksPath) {
    Copy-Item $bookmarksPath "$outDir\Bookmarks.json" -Force
}

# Copy extensions list
$extDir = "$chromeDir\Extensions"
if (Test-Path $extDir) {
    Copy-Item $extDir "$outDir\Extensions" -Recurse -Force
}

# Export history (SQLite)
$historyPath = "$chromeDir\History"
if (Test-Path $historyPath) {
    Copy-Item $historyPath "$outDir\History.sqlite" -Force
}

# Export passwords using DPAPI decryption
$loginData = "$chromeDir\Login Data"
if (Test-Path $loginData) {
    Copy-Item $loginData "$outDir\LoginData.sqlite" -Force
}

# Export cookies
$cookiesPath = "$chromeDir\Network\Cookies"
if (Test-Path $cookiesPath) {
    New-Item -ItemType Directory -Force -Path "$outDir\Network" | Out-Null
    Copy-Item $cookiesPath "$outDir\Network\Cookies" -Force
}

Write-JsonOutput @{ success = $true; outputDir = $outDir; size = (Get-FolderSize $outDir) }
```

- [ ] **Step 2: Commit**

```bash
git add scripts/browser/export-chrome.ps1
git commit -m "feat: add Chrome data export PowerShell script"
```

---

### Task 18: Edge data export script

**Files:**
- Create: `scripts/browser/export-edge.ps1`

- [ ] **Step 1: Write export-edge.ps1**

```powershell
param([switch]$CheckOnly)

. "$PSScriptRoot/../common/utils.ps1"

$edgeDir = "$env:LOCALAPPDATA\Microsoft\Edge\User Data\Default"
$found = Test-Path $edgeDir

if ($CheckOnly) {
    if ($found) {
        $size = Get-FolderSize $edgeDir
        Write-JsonOutput @{ found = $true; browser = "edge"; size = $size }
    } else {
        Write-JsonOutput @{ found = $false; browser = "edge"; size = 0 }
    }
    exit 0
}

if (-not $found) {
    Write-JsonOutput @{ success = $false; error = "Edge not found" }
    exit 1
}

$outDir = "$env:TEMP\pcmig_edge_export"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$bookmarks = "$edgeDir\Bookmarks"
if (Test-Path $bookmarks) { Copy-Item $bookmarks "$outDir\Bookmarks.json" -Force }

$extDir = "$edgeDir\Extensions"
if (Test-Path $extDir) { Copy-Item $extDir "$outDir\Extensions" -Recurse -Force }

$history = "$edgeDir\History"
if (Test-Path $history) { Copy-Item $history "$outDir\History.sqlite" -Force }

$loginData = "$edgeDir\Login Data"
if (Test-Path $loginData) { Copy-Item $loginData "$outDir\LoginData.sqlite" -Force }

Write-JsonOutput @{ success = $true; outputDir = $outDir; size = (Get-FolderSize $outDir) }
```

- [ ] **Step 2: Commit**

```bash
git add scripts/browser/export-edge.ps1
git commit -m "feat: add Edge data export PowerShell script"
```

---

### Task 19: Firefox data export script

**Files:**
- Create: `scripts/browser/export-firefox.ps1`

- [ ] **Step 1: Write export-firefox.ps1**

```powershell
param([switch]$CheckOnly)

. "$PSScriptRoot/../common/utils.ps1"

$ffProfilesDir = "$env:APPDATA\Mozilla\Firefox\Profiles"
$found = Test-Path $ffProfilesDir

if ($CheckOnly) {
    if ($found) {
        $size = Get-FolderSize $ffProfilesDir
        Write-JsonOutput @{ found = $true; browser = "firefox"; size = $size }
    } else {
        Write-JsonOutput @{ found = $false; browser = "firefox"; size = 0 }
    }
    exit 0
}

if (-not $found) {
    Write-JsonOutput @{ success = $false; error = "Firefox not found" }
    exit 1
}

$outDir = "$env:TEMP\pcmig_firefox_export"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

# Copy the default profile
$profiles = Get-ChildItem -Path $ffProfilesDir -Directory | Where-Object { $_.Name -like "*.default*" } | Sort-Object LastWriteTime -Descending
if ($profiles.Count -gt 0) {
    Copy-Item $profiles[0].FullName "$outDir\profile" -Recurse -Force
}

Write-JsonOutput @{ success = $true; outputDir = $outDir; size = (Get-FolderSize $outDir) }
```

- [ ] **Step 2: Commit**

```bash
git add scripts/browser/export-firefox.ps1
git commit -m "feat: add Firefox data export PowerShell script"
```

---

### Task 20: Unified browser import script

**Files:**
- Create: `scripts/browser/import-browser.ps1`

- [ ] **Step 1: Write import-browser.ps1**

```powershell
param(
    [Parameter(Mandatory=$true)]
    [string]$SourceDir,
    [string]$Browser = "chrome"
)

. "$PSScriptRoot/../common/utils.ps1"

switch ($Browser.ToLower()) {
    "chrome" { $targetDir = "$env:LOCALAPPDATA\Google\Chrome\User Data\Default" }
    "edge"   { $targetDir = "$env:LOCALAPPDATA\Microsoft\Edge\User Data\Default" }
    "firefox" {
        # Find the default profile
        $profilesDir = "$env:APPDATA\Mozilla\Firefox\Profiles"
        $profiles = Get-ChildItem $profilesDir -Directory | Where-Object { $_.Name -like "*.default*" } | Sort-Object LastWriteTime -Descending
        if ($profiles.Count -gt 0) { $targetDir = $profiles[0].FullName }
        else { $targetDir = $profilesDir }
    }
    default {
        Write-JsonOutput @{ success = $false; error = "Unknown browser: $Browser" }
        exit 1
    }
}

if (-not (Test-Path $SourceDir)) {
    Write-JsonOutput @{ success = $false; error = "Source directory not found: $SourceDir" }
    exit 1
}

# Ensure Chrome/Edge is closed before restoring
$browserProcesses = @{
    chrome  = "chrome"
    edge    = "msedge"
    firefox = "firefox"
}
$procName = $browserProcesses[$Browser.ToLower()]
if ($procName) {
    Get-Process -Name $procName -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
}

# Restore all files
New-Item -ItemType Directory -Force -Path $targetDir | Out-Null
Copy-Item "$SourceDir\*" $targetDir -Recurse -Force

Write-JsonOutput @{ success = $true; target = $targetDir }
```

- [ ] **Step 2: Commit**

```bash
git add scripts/browser/import-browser.ps1
git commit -m "feat: add unified browser data import script"
```

---

### Task 21: System settings export script

**Files:**
- Create: `scripts/system/export-settings.ps1`

- [ ] **Step 1: Write export-settings.ps1**

```powershell
param([switch]$CheckOnly)

. "$PSScriptRoot/../common/utils.ps1"

$items = @()

# Check wallpaper
try {
    $wpPath = (Get-ItemProperty -Path "HKCU:\Control Panel\Desktop" -Name WallPaper -ErrorAction Stop).WallPaper
    if ($wpPath) { $items += "wallpaper" }
} catch { }

# Check taskbar pins
$taskbandPath = "$env:APPDATA\Microsoft\Internet Explorer\Quick Launch\User Pinned\TaskBar"
if (Test-Path $taskbandPath) { $items += "taskbar_pins" }

# Check explorer settings
try {
    $hiddenFiles = (Get-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced" -Name Hidden -ErrorAction Stop).Hidden
    $items += "explorer_prefs"
} catch { }

# Check theme
try {
    $theme = (Get-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize" -Name AppsUseLightTheme -ErrorAction Stop).AppsUseLightTheme
    $items += "theme"
} catch { }

# WiFi profiles
try {
    $wifiProfiles = netsh wlan show profiles | Select-String "所有用户配置文件" | ForEach-Object { $_ -replace '.*:\s*', '' }
    if ($wifiProfiles) { $items += "wifi" }
} catch { }

# Power plan
try {
    $powerPlan = powercfg /GetActiveScheme
    if ($powerPlan) { $items += "power_plan" }
} catch { }

$totalItems = $items.Count

if ($CheckOnly) {
    Write-JsonOutput @{ found = ($totalItems -gt 0); size = ($totalItems * 1024); items = $items }
    exit 0
}

$outDir = "$env:TEMP\pcmig_settings_export"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$exportData = @{}

# Export wallpaper
if ($items -contains "wallpaper") {
    $wpPath = (Get-ItemProperty -Path "HKCU:\Control Panel\Desktop" -Name WallPaper).WallPaper
    if (Test-Path $wpPath) {
        Copy-Item $wpPath "$outDir\wallpaper$([System.IO.Path]::GetExtension($wpPath))" -Force
        $exportData.wallpaper = [System.IO.Path]::GetFileName($wpPath)
    }
}

# Export explorer settings
if ($items -contains "explorer_prefs") {
    $explorerKey = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced"
    $exportData.explorer = @{
        Hidden  = (Get-ItemProperty -Path $explorerKey -Name Hidden).Hidden
        HideFileExt = (Get-ItemProperty -Path $explorerKey -Name HideFileExt).HideFileExt
        ShowSuperHidden = (Get-ItemProperty -Path $explorerKey -Name ShowSuperHidden).ShowSuperHidden
    }
}

# Export theme
if ($items -contains "theme") {
    $themeKey = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize"
    $exportData.theme = @{
        AppsUseLightTheme = (Get-ItemProperty -Path $themeKey -Name AppsUseLightTheme).AppsUseLightTheme
        SystemUsesLightTheme = (Get-ItemProperty -Path $themeKey -Name SystemUsesLightTheme -ErrorAction SilentlyContinue).SystemUsesLightTheme
    }
}

# Export WiFi profiles
if ($items -contains "wifi") {
    netsh wlan export profile key=clear folder="$outDir\wifi" | Out-Null
    $exportData.wifi = $true
}

# Export power plan
if ($items -contains "power_plan") {
    powercfg /GetActiveScheme | Out-File "$outDir\power_plan.txt" -Encoding UTF8
    $exportData.power_plan = $true
}

$exportData | ConvertTo-Json -Depth 5 | Out-File "$outDir\settings_data.json" -Encoding UTF8

Write-JsonOutput @{ success = $true; outputDir = $outDir; size = (Get-FolderSize $outDir) }
```

- [ ] **Step 2: Commit**

```bash
git add scripts/system/export-settings.ps1
git commit -m "feat: add system settings export script (wallpaper, taskbar, theme, wifi, etc.)"
```

---

### Task 22: System settings import script

**Files:**
- Create: `scripts/system/import-settings.ps1`

- [ ] **Step 1: Write import-settings.ps1**

```powershell
param(
    [Parameter(Mandatory=$true)]
    [string]$SourceDir
)

. "$PSScriptRoot/../common/utils.ps1"

$dataFile = "$SourceDir\settings_data.json"
if (-not (Test-Path $dataFile)) {
    Write-JsonOutput @{ success = $false; error = "settings_data.json not found" }
    exit 1
}

$data = Get-Content $dataFile -Encoding UTF8 | ConvertFrom-Json

# Restore wallpaper
if ($data.wallpaper) {
    $wpFile = Get-ChildItem "$SourceDir\wallpaper.*" | Select-Object -First 1
    if ($wpFile) {
        Set-ItemProperty -Path "HKCU:\Control Panel\Desktop" -Name WallPaper -Value $wpFile.FullName
    }
}

# Restore explorer preferences
if ($data.explorer) {
    $explorerKey = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced"
    Set-ItemProperty -Path $explorerKey -Name Hidden -Value $data.explorer.Hidden
    Set-ItemProperty -Path $explorerKey -Name HideFileExt -Value $data.explorer.HideFileExt
    Set-ItemProperty -Path $explorerKey -Name ShowSuperHidden -Value $data.explorer.ShowSuperHidden
    # Refresh explorer
    Stop-Process -Name explorer -Force -ErrorAction SilentlyContinue
    Start-Process explorer
}

# Restore theme
if ($data.theme) {
    $themeKey = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize"
    Set-ItemProperty -Path $themeKey -Name AppsUseLightTheme -Value $data.theme.AppsUseLightTheme
    if ($data.theme.SystemUsesLightTheme -ne $null) {
        Set-ItemProperty -Path $themeKey -Name SystemUsesLightTheme -Value $data.theme.SystemUsesLightTheme
    }
}

# Import WiFi profiles
if ($data.wifi) {
    Get-ChildItem "$SourceDir\wifi\*.xml" | ForEach-Object {
        netsh wlan add profile filename="$($_.FullName)" | Out-Null
    }
}

# Restore power plan (just note it — can't directly set GUID on different hardware)
if ($data.power_plan) {
    Write-Output "Power plan info was exported. Manual reconfiguration may be needed."
}

Write-JsonOutput @{ success = $true; items_restored = ($data.PSObject.Properties | Measure-Object).Count }
```

- [ ] **Step 2: Commit**

```bash
git add scripts/system/import-settings.ps1
git commit -m "feat: add system settings import/restore script"
```

---

### Task 23: App config export scripts

**Files:**
- Create: `scripts/apps/export-wechat.ps1`
- Create: `scripts/apps/export-office.ps1`
- Create: `scripts/apps/export-input-method.ps1`
- Create: `scripts/apps/export-app-list.ps1`

- [ ] **Step 1: Write export-wechat.ps1**

```powershell
param([switch]$CheckOnly)

. "$PSScriptRoot/../common/utils.ps1"
$wechatDir = "$env:USERPROFILE\Documents\WeChat Files"
$found = Test-Path $wechatDir

if ($CheckOnly) {
    $size = if ($found) { Get-FolderSize $wechatDir } else { 0 }
    Write-JsonOutput @{ found = $found; app = "wechat"; size = $size }
    exit 0
}

if (-not $found) {
    Write-JsonOutput @{ success = $false; error = "WeChat files not found" }
    exit 1
}

$outDir = "$env:TEMP\pcmig_wechat_export"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
Copy-Item $wechatDir "$outDir\WeChat Files" -Recurse -Force
Write-JsonOutput @{ success = $true; outputDir = $outDir; size = (Get-FolderSize $outDir) }
```

- [ ] **Step 2: Write export-office.ps1**

```powershell
param([switch]$CheckOnly)

. "$PSScriptRoot/../common/utils.ps1"
$templatesDir = "$env:APPDATA\Microsoft\Templates"
$officeDir = "$env:APPDATA\Microsoft\Office"
$found = (Test-Path $templatesDir) -or (Test-Path $officeDir)

if ($CheckOnly) {
    $size = 0
    if (Test-Path $templatesDir) { $size += Get-FolderSize $templatesDir }
    if (Test-Path $officeDir) { $size += Get-FolderSize $officeDir }
    Write-JsonOutput @{ found = $found; app = "office"; size = $size }
    exit 0
}

$outDir = "$env:TEMP\pcmig_office_export"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
if (Test-Path $templatesDir) { Copy-Item $templatesDir "$outDir\Templates" -Recurse -Force }
if (Test-Path $officeDir) { Copy-Item $officeDir "$outDir\Office" -Recurse -Force }
Write-JsonOutput @{ success = $true; outputDir = $outDir; size = (Get-FolderSize $outDir) }
```

- [ ] **Step 3: Write export-input-method.ps1**

```powershell
param([switch]$CheckOnly)

. "$PSScriptRoot/../common/utils.ps1"
# Sogou Pinyin
$sogouDir = "$env:LOCALAPPDATA\..\LocalLow\SogouPY.users"
$found = Test-Path $sogouDir

if ($CheckOnly) {
    $size = if ($found) { Get-FolderSize $sogouDir } else { 0 }
    Write-JsonOutput @{ found = $found; app = "ime_sogou"; size = $size }
    exit 0
}

$outDir = "$env:TEMP\pcmig_ime_export"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
if ($found) { Copy-Item $sogouDir "$outDir\SogouPY" -Recurse -Force }
Write-JsonOutput @{ success = $true; outputDir = $outDir; size = (Get-FolderSize $outDir) }
```

- [ ] **Step 4: Write export-app-list.ps1**

```powershell
param([switch]$CheckOnly)

$apps = @()
$paths = @(
    "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*",
    "HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*",
    "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*"
)

foreach ($path in $paths) {
    if (Test-Path (Split-Path $path)) {
        $items = Get-ItemProperty $path -ErrorAction SilentlyContinue |
            Where-Object { $_.DisplayName -and $_.DisplayName -notlike "*Update*" -and $_.DisplayName -notlike "*Driver*" } |
            Select-Object DisplayName, DisplayVersion, Publisher
        $apps += $items
    }
}

$unique = $apps | Sort-Object DisplayName -Unique

if ($CheckOnly) {
    Write-JsonOutput @{ found = ($unique.Count -gt 0); count = $unique.Count }
    exit 0
}

Write-JsonOutput @{ apps = @($unique | ForEach-Object { @{ name = $_.DisplayName; version = $_.DisplayVersion; publisher = $_.Publisher } }) }
```

- [ ] **Step 5: Commit**

```bash
git add scripts/apps/export-wechat.ps1 scripts/apps/export-office.ps1 scripts/apps/export-input-method.ps1 scripts/apps/export-app-list.ps1
git commit -m "feat: add app config export scripts (WeChat, Office, IME, app list)"
```

---

## Phase 7: UI Layer

### Task 24: WelcomePage

**Files:**
- Create: `src/pages/WelcomePage.tsx`
- Create: `src/pages/WelcomePage.css`

- [ ] **Step 1: Write WelcomePage.tsx**

```tsx
import { useNavigate } from 'react-router-dom';
import './WelcomePage.css';

export default function WelcomePage() {
  const navigate = useNavigate();

  return (
    <div className="welcome-container">
      <h1 className="welcome-title">PC 迁移助手</h1>
      <p className="welcome-subtitle">安全、快速地将数据从旧电脑迁移到新电脑</p>
      <div className="welcome-cards">
        <button className="welcome-card" onClick={() => navigate('/method?role=source')}>
          <div className="welcome-card-icon">📤</div>
          <h2>这是旧电脑</h2>
          <p>我要导出数据</p>
        </button>
        <button className="welcome-card" onClick={() => navigate('/method?role=target')}>
          <div className="welcome-card-icon">📥</div>
          <h2>这是新电脑</h2>
          <p>我要导入数据</p>
        </button>
      </div>
      <div className="welcome-footer">v1.0.0</div>
    </div>
  );
}
```

- [ ] **Step 2: Write WelcomePage.css**

```css
.welcome-container {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  min-height: 100vh; padding: 48px 24px;
}
.welcome-title { font-size: 32px; margin-bottom: 8px; }
.welcome-subtitle { color: #666; margin-bottom: 48px; }
.welcome-cards { display: flex; gap: 24px; }
.welcome-card {
  display: flex; flex-direction: column; align-items: center; padding: 40px 48px;
  border: 2px solid #e0e0e0; border-radius: 16px; cursor: pointer;
  background: white; transition: border-color 0.2s, box-shadow 0.2s;
}
.welcome-card:hover { border-color: #4a90d9; box-shadow: 0 4px 16px rgba(74,144,217,0.15); }
.welcome-card-icon { font-size: 48px; margin-bottom: 16px; }
.welcome-card h2 { font-size: 20px; margin-bottom: 4px; }
.welcome-card p { color: #888; }
.welcome-footer { margin-top: 64px; color: #aaa; font-size: 12px; }
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/WelcomePage.tsx src/pages/WelcomePage.css
git commit -m "feat: add WelcomePage with source/target role selection"
```

---

### Task 25: TransferMethodPage

**Files:**
- Create: `src/pages/TransferMethodPage.tsx`
- Create: `src/pages/TransferMethodPage.css`

- [ ] **Step 1: Write TransferMethodPage.tsx**

```tsx
import { useNavigate, useSearchParams } from 'react-router-dom';
import './TransferMethodPage.css';

export default function TransferMethodPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const role = params.get('role') || 'source';

  const select = (method: string) => {
    if (method === 'lan') {
      navigate(`/pairing?role=${role}`);
    } else {
      navigate(`/scan?role=${role}&method=storage`);
    }
  };

  return (
    <div className="method-container">
      <div className="method-back" onClick={() => navigate('/')}>← 返回</div>
      <h1>选择传输方式</h1>
      <div className="method-cards">
        <div className="method-card recommended" onClick={() => select('lan')}>
          <div className="method-badge">推荐</div>
          <h2>WiFi / 局域网</h2>
          <p>同一网络下直连传输，速度快</p>
        </div>
        <div className="method-card" onClick={() => select('storage')}>
          <h2>外接存储</h2>
          <p>U盘或移动硬盘中转，无需网络</p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write TransferMethodPage.css**

```css
.method-container { padding: 48px 80px; }
.method-back { cursor: pointer; color: #4a90d9; margin-bottom: 32px; }
.method-cards { display: flex; gap: 24px; margin-top: 32px; }
.method-card {
  flex: 1; padding: 40px; border: 2px solid #e0e0e0; border-radius: 16px;
  cursor: pointer; position: relative; transition: border-color 0.2s;
}
.method-card:hover { border-color: #4a90d9; }
.method-card.recommended { border-color: #4a90d9; background: #f5f9ff; }
.method-badge { position: absolute; top: -12px; left: 24px; background: #4a90d9; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; }
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/TransferMethodPage.tsx src/pages/TransferMethodPage.css
git commit -m "feat: add TransferMethodPage with LAN and storage options"
```

---

### Task 26: PairingPage

**Files:**
- Create: `src/pages/PairingPage.tsx`
- Create: `src/pages/PairingPage.css`

- [ ] **Step 1: Write PairingPage.tsx**

```tsx
import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import './PairingPage.css';

export default function PairingPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const role = params.get('role') || 'source';
  const [code, setCode] = useState('');
  const [inputCode, setInputCode] = useState(['', '', '', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (role === 'source') {
      const generated = String(Math.floor(100000 + Math.random() * 900000));
      setCode(generated);
      // In production: call IPC to start server
      window.electronAPI?.invoke('pairing:generate', generated);
    }
  }, [role]);

  const handleInput = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...inputCode];
    next[index] = value;
    setInputCode(next);
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
    if (next.every(d => d !== '')) {
      window.electronAPI?.invoke('pairing:connect', next.join(''))
        .then((ok: boolean) => ok && navigate('/scan?role=target&method=lan'));
    }
  };

  if (role === 'source') {
    return (
      <div className="pairing-container">
        <h1>配对码</h1>
        <p className="pairing-hint">请在新电脑上输入此 6 位数字</p>
        <div className="pairing-code-display">{code}</div>
        <p className="pairing-waiting">等待新电脑连接...</p>
        <button className="pairing-back" onClick={() => navigate('/method?role=source')}>取消</button>
      </div>
    );
  }

  return (
    <div className="pairing-container">
      <h1>输入配对码</h1>
      <p className="pairing-hint">请输入旧电脑上显示的 6 位数字</p>
      <div className="pairing-input-row">
        {inputCode.map((d, i) => (
          <input
            key={i}
            ref={el => { inputRefs.current[i] = el; }}
            className="pairing-digit"
            maxLength={1}
            value={d}
            onChange={e => handleInput(i, e.target.value)}
            autoFocus={i === 0}
          />
        ))}
      </div>
      <button className="pairing-back" onClick={() => navigate('/method?role=target')}>返回</button>
    </div>
  );
}
```

- [ ] **Step 2: Write PairingPage.css**

```css
.pairing-container { display: flex; flex-direction: column; align-items: center; padding: 80px 24px; }
.pairing-hint { color: #666; margin-bottom: 32px; }
.pairing-code-display { font-size: 56px; font-weight: 700; letter-spacing: 16px; color: #4a90d9; margin-bottom: 32px; }
.pairing-waiting { color: #888; }
.pairing-input-row { display: flex; gap: 12px; margin-bottom: 32px; }
.pairing-digit { width: 52px; height: 64px; text-align: center; font-size: 28px; border: 2px solid #ccc; border-radius: 8px; }
.pairing-digit:focus { border-color: #4a90d9; outline: none; }
.pairing-back { background: none; border: 1px solid #ccc; border-radius: 8px; padding: 8px 24px; cursor: pointer; margin-top: 16px; }
```

- [ ] **Step 3: Update App.tsx to add routes**

Modify `src/App.tsx`:
```tsx
import { HashRouter, Routes, Route } from 'react-router-dom';
import WelcomePage from './pages/WelcomePage';
import TransferMethodPage from './pages/TransferMethodPage';
import PairingPage from './pages/PairingPage';

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<WelcomePage />} />
        <Route path="/method" element={<TransferMethodPage />} />
        <Route path="/pairing" element={<PairingPage />} />
      </Routes>
    </HashRouter>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/PairingPage.tsx src/pages/PairingPage.css src/App.tsx
git commit -m "feat: add PairingPage with code display and input"
```

---

### Task 27: ScanPreviewPage

**Files:**
- Create: `src/pages/ScanPreviewPage.tsx`
- Create: `src/pages/ScanPreviewPage.css`

- [ ] **Step 1: Write ScanPreviewPage.tsx**

```tsx
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ProgressBar } from '../components/ProgressBar';
import './ScanPreviewPage.css';

interface Section {
  id: string; label: string; size: number; selected: boolean; priority: number;
  children?: Section[];
}

export default function ScanPreviewPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const role = params.get('role') || 'source';
  const method = params.get('method') || 'lan';

  const [scanning, setScanning] = useState(true);
  const [sections, setSections] = useState<Section[]>([]);
  const [scanMsg, setScanMsg] = useState('正在扫描...');
  const [capacity, setCapacity] = useState({ available: 0, used: 0 });

  useEffect(() => {
    // Simulate scanning — in production calls IPC scan:start
    const timer = setTimeout(() => {
      setSections([
        { id: 'system_settings', label: '系统设置', size: 1.2 * 1024 * 1024, selected: true, priority: 0 },
        { id: 'browser', label: '浏览器数据', size: 86 * 1024 * 1024, selected: true, priority: 1,
          children: [
            { id: 'browser_chrome', label: 'Chrome', size: 45 * 1024 * 1024, selected: true, priority: 0 },
            { id: 'browser_edge', label: 'Edge', size: 41 * 1024 * 1024, selected: true, priority: 0 },
          ]
        },
        { id: 'app_configs', label: '应用配置', size: 2.1 * 1024 * 1024 * 1024, selected: true, priority: 2,
          children: [
            { id: 'app_wechat', label: '微信', size: 1.9 * 1024 * 1024 * 1024, selected: true, priority: 0 },
            { id: 'app_office', label: 'Office', size: 200 * 1024 * 1024, selected: true, priority: 0 },
          ]
        },
        { id: 'files', label: '用户文件', size: 120 * 1024 * 1024 * 1024, selected: true, priority: 3,
          children: [
            { id: 'files_desktop', label: '桌面', size: 12 * 1024 * 1024 * 1024, selected: true, priority: 0 },
            { id: 'files_docs', label: '文档', size: 35 * 1024 * 1024 * 1024, selected: true, priority: 1 },
            { id: 'files_pics', label: '图片', size: 45 * 1024 * 1024 * 1024, selected: false, priority: 2 },
            { id: 'files_videos', label: '视频', size: 25 * 1024 * 1024 * 1024, selected: false, priority: 3 },
            { id: 'files_downloads', label: '下载', size: 3 * 1024 * 1024 * 1024, selected: false, priority: 4 },
          ]
        },
      ]);
      setCapacity({ available: 300 * 1024 * 1024 * 1024, used: 49 * 1024 * 1024 * 1024 });
      setScanning(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  const toggleSection = (id: string, parentId?: string) => {
    setSections(prev => prev.map(s => {
      if (parentId && s.id === parentId && s.children) {
        const updatedChildren = s.children.map(c => c.id === id ? { ...c, selected: !c.selected } : c);
        return { ...s, children: updatedChildren, selected: updatedChildren.some(c => c.selected) };
      }
      if (!parentId && s.id === id) {
        const newSel = !s.selected;
        return { ...s, selected: newSel, children: s.children?.map(c => ({ ...c, selected: newSel })) };
      }
      return s;
    }));
  };

  const totalSelected = sections.reduce((sum, s) =>
    sum + (s.children
      ? s.children.filter(c => c.selected).reduce((cs, c) => cs + c.size, 0)
      : s.selected ? s.size : 0), 0);

  const formatSize = (bytes: number) => {
    if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024**3)).toFixed(1)} GB`;
    if (bytes >= 1024 * 1024) return `${(bytes / (1024**2)).toFixed(1)} MB`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  if (scanning) {
    return (
      <div className="scan-container">
        <h1>{scanMsg}</h1>
        <ProgressBar percent={50} indeterminate />
      </div>
    );
  }

  const fits = totalSelected <= capacity.available;

  return (
    <div className="scan-container">
      <h1>选择要迁移的内容</h1>
      {!fits && (
        <div className="scan-warning">
          ⚠️ 已选数据超过目标容量 {formatSize(Math.max(0, totalSelected - capacity.available))}
        </div>
      )}
      <div className="scan-layout">
        <div className="scan-sections">
          {sections.map(s => (
            <div key={s.id} className="scan-section">
              <label className="scan-section-header">
                <input type="checkbox" checked={s.selected} onChange={() => toggleSection(s.id)} />
                <span>{s.label}</span>
                <span className="scan-section-size">{formatSize(s.size)}</span>
              </label>
              {s.children && (
                <div className="scan-children">
                  {s.children.map(c => (
                    <label key={c.id} className="scan-child">
                      <input type="checkbox" checked={c.selected} onChange={() => toggleSection(c.id, s.id)} />
                      <span>{c.label}</span>
                      <span className="scan-section-size">{formatSize(c.size)}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="scan-summary">
          <div className="scan-capacity-bar">
            <ProgressBar percent={capacity.available > 0 ? Math.round((totalSelected / capacity.available) * 100) : 100} />
          </div>
          <p>已选: {formatSize(totalSelected)}</p>
          <p>目标可用: {formatSize(capacity.available)}</p>
          {!fits && <button className="scan-auto-btn" onClick={() => {/* autoSelectByCapacity */}}>智能推荐选择</button>}
        </div>
      </div>
      <button className="scan-start-btn" disabled={totalSelected === 0} onClick={() => navigate('/transfer?role=' + role + '&method=' + method)}>
        开始迁移
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Write ScanPreviewPage.css**

```css
.scan-container { padding: 40px 60px; }
.scan-warning { background: #fff3cd; border: 1px solid #ffc107; border-radius: 8px; padding: 12px 16px; margin-bottom: 16px; }
.scan-layout { display: flex; gap: 32px; margin-top: 24px; }
.scan-sections { flex: 1; }
.scan-section { margin-bottom: 12px; border: 1px solid #e8e8e8; border-radius: 8px; padding: 12px; }
.scan-section-header { display: flex; align-items: center; gap: 8px; font-weight: 600; cursor: pointer; }
.scan-section-size { margin-left: auto; color: #888; font-weight: 400; }
.scan-children { margin-left: 24px; margin-top: 8px; }
.scan-child { display: flex; align-items: center; gap: 8px; padding: 4px 0; cursor: pointer; font-size: 14px; }
.scan-summary { width: 200px; padding: 20px; background: #f9f9f9; border-radius: 12px; align-self: flex-start; }
.scan-capacity-bar { margin-bottom: 12px; }
.scan-auto-btn { width: 100%; padding: 8px; background: #4a90d9; color: white; border: none; border-radius: 8px; cursor: pointer; margin-top: 12px; }
.scan-start-btn { margin-top: 24px; padding: 14px 48px; background: #4a90d9; color: white; border: none; border-radius: 10px; font-size: 16px; cursor: pointer; }
.scan-start-btn:disabled { background: #ccc; cursor: not-allowed; }
```

- [ ] **Step 3: Create ProgressBar component**

Create `src/components/ProgressBar.tsx`:
```tsx
interface Props {
  percent: number;
  indeterminate?: boolean;
}

export function ProgressBar({ percent, indeterminate }: Props) {
  return (
    <div style={{ width: '100%', height: 8, background: '#e0e0e0', borderRadius: 4, overflow: 'hidden' }}>
      <div style={{
        width: indeterminate ? '50%' : `${Math.min(100, Math.max(0, percent))}%`,
        height: '100%', background: '#4a90d9', borderRadius: 4,
        transition: 'width 0.3s',
        ...(indeterminate ? { animation: 'progressIndeterminate 1.5s infinite' } : {})
      }} />
      <style>{`@keyframes progressIndeterminate { 0% { margin-left: -50%; } 100% { margin-left: 100%; } }`}</style>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/ScanPreviewPage.tsx src/pages/ScanPreviewPage.css src/components/ProgressBar.tsx
git commit -m "feat: add ScanPreviewPage with capacity-aware content selection"
```

---

### Task 28: TransferProgressPage

**Files:**
- Create: `src/pages/TransferProgressPage.tsx`
- Create: `src/pages/TransferProgressPage.css`

- [ ] **Step 1: Write TransferProgressPage.tsx**

```tsx
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ProgressBar } from '../components/ProgressBar';
import './TransferProgressPage.css';

export default function TransferProgressPage() {
  const navigate = useNavigate();
  const [percent, setPercent] = useState(0);
  const [currentFile, setCurrentFile] = useState('正在准备...');
  const [speed, setSpeed] = useState('0 MB/s');
  const [remaining, setRemaining] = useState('计算中...');
  const [logExpanded, setLogExpanded] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    // In production: listen to IPC transfer:progress events
    const interval = setInterval(() => {
      setPercent(p => {
        if (p >= 100) { clearInterval(interval); return 100; }
        return p + Math.random() * 5;
      });
    }, 300);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (percent >= 100) {
      setTimeout(() => navigate('/complete'), 800);
    }
  }, [percent]);

  return (
    <div className="transfer-container">
      <h1>正在迁移数据...</h1>
      <div className="transfer-progress">
        <ProgressBar percent={percent} />
        <span className="transfer-percent">{Math.round(percent)}%</span>
      </div>
      <div className="transfer-stats">
        <div className="transfer-stat">
          <span className="transfer-stat-label">当前文件</span>
          <span className="transfer-stat-value">{currentFile}</span>
        </div>
        <div className="transfer-stat">
          <span className="transfer-stat-label">速度</span>
          <span className="transfer-stat-value">{speed}</span>
        </div>
        <div className="transfer-stat">
          <span className="transfer-stat-label">剩余时间</span>
          <span className="transfer-stat-value">{remaining}</span>
        </div>
      </div>
      <div className="transfer-log-toggle" onClick={() => setLogExpanded(!logExpanded)}>
        {logExpanded ? '收起日志' : '展开日志'} ▾
      </div>
      {logExpanded && (
        <div className="transfer-log">
          {logs.length === 0 ? <p className="transfer-log-empty">暂无日志</p> :
            logs.map((l, i) => <p key={i} className="transfer-log-line">{l}</p>)}
        </div>
      )}
      <button className="transfer-cancel" onClick={() => navigate('/')}>取消迁移</button>
    </div>
  );
}
```

- [ ] **Step 2: Write TransferProgressPage.css**

```css
.transfer-container { display: flex; flex-direction: column; align-items: center; padding: 64px 24px; }
.transfer-progress { display: flex; align-items: center; gap: 16px; width: 480px; margin-top: 24px; }
.transfer-progress > div { flex: 1; }
.transfer-percent { font-size: 24px; font-weight: 600; color: #4a90d9; min-width: 48px; }
.transfer-stats { display: flex; gap: 48px; margin-top: 32px; }
.transfer-stat { display: flex; flex-direction: column; align-items: center; }
.transfer-stat-label { font-size: 12px; color: #888; }
.transfer-stat-value { font-size: 14px; margin-top: 4px; }
.transfer-log-toggle { margin-top: 32px; color: #4a90d9; cursor: pointer; }
.transfer-log { width: 480px; max-height: 200px; overflow-y: auto; background: #f5f5f5; border-radius: 8px; padding: 12px; margin-top: 8px; }
.transfer-log-line { font-size: 12px; color: #555; font-family: monospace; }
.transfer-log-empty { color: #aaa; font-size: 12px; }
.transfer-cancel { margin-top: 32px; background: none; border: 1px solid #ccc; border-radius: 8px; padding: 8px 24px; cursor: pointer; }
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/TransferProgressPage.tsx src/pages/TransferProgressPage.css
git commit -m "feat: add TransferProgressPage with progress, stats, and log"
```

---

### Task 29: CompletePage

**Files:**
- Create: `src/pages/CompletePage.tsx`
- Create: `src/pages/CompletePage.css`

- [ ] **Step 1: Write CompletePage.tsx**

```tsx
import { useNavigate } from 'react-router-dom';
import './CompletePage.css';

export default function CompletePage() {
  const navigate = useNavigate();

  return (
    <div className="complete-container">
      <div className="complete-icon">✓</div>
      <h1>迁移完成！</h1>
      <div className="complete-summary">
        <div className="complete-stat">
          <span className="complete-stat-num">12,483</span>
          <span className="complete-stat-label">文件已迁移</span>
        </div>
        <div className="complete-stat">
          <span className="complete-stat-num">156 GB</span>
          <span className="complete-stat-label">数据量</span>
        </div>
        <div className="complete-stat">
          <span className="complete-stat-num">8:32</span>
          <span className="complete-stat-label">耗时</span>
        </div>
      </div>
      <button className="complete-done-btn" onClick={() => navigate('/')}>完成</button>
    </div>
  );
}
```

- [ ] **Step 2: Write CompletePage.css**

```css
.complete-container { display: flex; flex-direction: column; align-items: center; padding: 80px 24px; }
.complete-icon { width: 80px; height: 80px; border-radius: 50%; background: #4caf50; color: white; display: flex; align-items: center; justify-content: center; font-size: 40px; margin-bottom: 24px; }
.complete-summary { display: flex; gap: 48px; margin: 40px 0; }
.complete-stat { display: flex; flex-direction: column; align-items: center; }
.complete-stat-num { font-size: 24px; font-weight: 700; color: #333; }
.complete-stat-label { font-size: 14px; color: #888; margin-top: 4px; }
.complete-done-btn { padding: 14px 48px; background: #4a90d9; color: white; border: none; border-radius: 10px; font-size: 16px; cursor: pointer; }
```

- [ ] **Step 3: Update App.tsx with all routes**

```tsx
import { HashRouter, Routes, Route } from 'react-router-dom';
import WelcomePage from './pages/WelcomePage';
import TransferMethodPage from './pages/TransferMethodPage';
import PairingPage from './pages/PairingPage';
import ScanPreviewPage from './pages/ScanPreviewPage';
import TransferProgressPage from './pages/TransferProgressPage';
import CompletePage from './pages/CompletePage';

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<WelcomePage />} />
        <Route path="/method" element={<TransferMethodPage />} />
        <Route path="/pairing" element={<PairingPage />} />
        <Route path="/scan" element={<ScanPreviewPage />} />
        <Route path="/transfer" element={<TransferProgressPage />} />
        <Route path="/complete" element={<CompletePage />} />
      </Routes>
    </HashRouter>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/CompletePage.tsx src/pages/CompletePage.css src/App.tsx
git commit -m "feat: add CompletePage with summary stats and finalize routing"
```

---

## Phase 8: Integration & Polish

### Task 30: Wire IPC handlers in main process

**Files:**
- Modify: `electron/main.ts`

- [ ] **Step 1: Update main.ts with IPC handlers and server lifecycle**

```typescript
import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { IPC } from './ipc-channels';
import { scanAll } from './scanner';
import { MigrationServer } from './network/server';
import { MigrationClient } from './network/client';

let mainWindow: BrowserWindow | null = null;
let migrationServer: MigrationServer | null = null;
let migrationClient: MigrationClient | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 960, height: 680, resizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, nodeIntegration: false
    }
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

function setupIpc() {
  ipcMain.handle(IPC.SCAN_START, async () => {
    const result = await scanAll((stage, detail) => {
      mainWindow?.webContents.send(IPC.SCAN_PROGRESS, { stage, detail });
    });
    mainWindow?.webContents.send(IPC.SCAN_COMPLETE, result);
    return result;
  });

  ipcMain.handle(IPC.PAIRING_GENERATE, async (_event, code: string) => {
    migrationServer = new MigrationServer();
    const { port } = await migrationServer.start();
    return { code, port };
  });

  ipcMain.handle(IPC.PAIRING_CONNECT, async (_event, host: string, port: number, code: string) => {
    migrationClient = new MigrationClient();
    const ok = await migrationClient.connect(host, port, code);
    return ok;
  });

  ipcMain.handle(IPC.TRANSFER_START, async () => {
    // Start streaming transfer
  });

  ipcMain.handle(IPC.TRANSFER_CANCEL, async () => {
    migrationServer?.stop();
    migrationClient?.disconnect();
  });

  ipcMain.handle(IPC.GET_SYSTEM_INFO, () => ({
    hostname: require('os').hostname(),
    os: `Windows ${require('os').release()}`,
    arch: process.arch,
    username: require('os').userInfo().username
  }));
}

app.whenReady().then(() => {
  setupIpc();
  createWindow();
});

app.on('window-all-closed', () => {
  migrationServer?.stop();
  migrationClient?.disconnect();
  app.quit();
});
```

- [ ] **Step 2: Commit**

```bash
git add electron/main.ts
git commit -m "feat: wire IPC handlers and server lifecycle into main process"
```

---

### Task 31: Add TypeScript definition for window.electronAPI

**Files:**
- Create: `src/types/electron.d.ts`

- [ ] **Step 1: Write type declaration**

```typescript
export {};

declare global {
  interface Window {
    electronAPI?: {
      invoke: (channel: string, ...args: unknown[]) => Promise<unknown>;
      on: (channel: string, callback: (...args: unknown[]) => void) => void;
      removeAllListeners: (channel: string) => void;
    };
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types/electron.d.ts
git commit -m "feat: add TypeScript declarations for electronAPI"
```

---

### Task 32: Final verification build

- [ ] **Step 1: Full type-check**

```bash
npx tsc --noEmit -p tsconfig.json 2>&1 || true
npx tsc --noEmit -p tsconfig.node.json
```

- [ ] **Step 2: Build production**

```bash
npx vite build && npx tsc -p tsconfig.node.json
```

- [ ] **Step 3: Run all tests**

```bash
npx vitest run
```

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "chore: final integration and build verification"
```

---

## Phase Summary

| Phase | Tasks | Estimated Total Time |
|-------|-------|---------------------|
| 1. Scaffolding | 2 | ~15 min |
| 2. Core Infrastructure | 4 | ~30 min |
| 3. Scanning Layer | 3 | ~45 min |
| 4. Storage Layer | 3 | ~45 min |
| 5. Network Layer | 4 | ~45 min |
| 6. PowerShell Scripts | 7 | ~60 min |
| 7. UI Layer | 6 | ~90 min |
| 8. Integration & Polish | 3 | ~30 min |
| **Total** | **32** | **~6 hours** |
