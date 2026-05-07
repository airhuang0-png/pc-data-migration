import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { MigrationServer } from './network/server';
import { MigrationClient } from './network/client';
import { startBroadcast, startDiscovery } from './network/discovery';
import { scanAll } from './scanner';
import { packToFile } from './storage/packager';
import { extractBundle } from './storage/extractor';
import { runScript } from './powershell/runner';

let mainWindow: BrowserWindow | null = null;
let server: MigrationServer | null = null;
let client: MigrationClient | null = null;
let stopBroadcast: (() => void) | null = null;
let stopDiscovery: (() => void) | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 960,
    height: 680,
    resizable: false,
    show: false,
    backgroundColor: '#f5f5f5',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

// ==================== Pairing ====================

ipcMain.handle('pairing:generate', async () => {
  if (server) return { error: '已在等待连接中' };
  try {
    server = new MigrationServer();
    const { port, session } = await server.start(() => {
      mainWindow?.webContents.send('pairing:ready');
    });
    stopBroadcast = startBroadcast(port);
    return { code: session.code, port };
  } catch (e: any) {
    return { error: e.message };
  }
});

ipcMain.handle('pairing:connect', async (_event, code: string) => {
  return new Promise((resolve) => {
    let resolved = false;

    stopDiscovery = startDiscovery(async (info) => {
      if (resolved) return;
      resolved = true;
      try {
        stopDiscovery?.();
        stopDiscovery = null;
        client = new MigrationClient();
        const ok = await client.connect(info.host, info.port, code);
        if (ok) resolve({ success: true, host: info.host, port: info.port });
        else resolve({ success: false, error: '配对码错误或已过期' });
      } catch (e: any) {
        resolve({ success: false, error: e.message });
      }
    });

    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        stopDiscovery?.();
        stopDiscovery = null;
        resolve({ success: false, error: '未在局域网中找到发送端' });
      }
    }, 15000);
  });
});

// ==================== Scan ====================

ipcMain.handle('scan:start', async () => {
  try {
    mainWindow?.webContents.send('scan:progress', { stage: 'scanning', message: '正在扫描...' });
    const result = await scanAll((stage, detail) => {
      mainWindow?.webContents.send('scan:progress', { stage, message: detail });
    });
    return { success: true, manifest: result.manifest, preview: result.preview };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
});

// ==================== Transfer (Source) ====================

ipcMain.handle('transfer:start', async (_event, selectedSections: string[]) => {
  if (!server?.connected) return { success: false, error: '未连接到目标电脑' };

  try {
    // 1. Scan
    mainWindow?.webContents.send('transfer:progress', { percent: 5, file: '正在扫描文件...' });
    const scanResult = await scanAll((stage, detail) => {
      mainWindow?.webContents.send('transfer:progress', { percent: 10, file: `${stage}: ${detail}` });
    });

    // 2. Run export scripts
    mainWindow?.webContents.send('transfer:progress', { percent: 15, file: '正在导出数据...' });

    if (selectedSections.includes('browser') || selectedSections.length === 0) {
      for (const script of ['export-chrome.ps1', 'export-edge.ps1', 'export-firefox.ps1']) {
        await runScript(`browser/${script}`);
      }
    }
    if (selectedSections.includes('app_configs') || selectedSections.length === 0) {
      for (const script of ['export-wechat.ps1', 'export-office.ps1', 'export-input-method.ps1']) {
        await runScript(`apps/${script}`);
      }
    }
    if (selectedSections.includes('system_settings') || selectedSections.length === 0) {
      await runScript('system/export-settings.ps1');
    }

    // 3. Pack to temp file
    mainWindow?.webContents.send('transfer:progress', { percent: 30, file: '正在打包数据...' });
    const pcmigDir = path.join(os.tmpdir(), 'pcmig_export');
    fs.mkdirSync(pcmigDir, { recursive: true });
    const bundlePath = path.join(pcmigDir, 'bundle.tar.gz');
    await packToFile(scanResult, bundlePath);

    // 4. Send via WebSocket
    const fileSize = fs.statSync(bundlePath).size;
    const CHUNK_SIZE = 64 * 1024; // 64KB chunks

    server.send({ type: 'manifest', payload: scanResult.manifest });
    server.send({ type: 'file_start', payload: { name: 'bundle.tar.gz', size: fileSize } });

    const fd = fs.openSync(bundlePath, 'r');
    const buf = Buffer.alloc(CHUNK_SIZE);
    let bytesSent = 0;
    let bytesRead: number;

    while ((bytesRead = fs.readSync(fd, buf, 0, CHUNK_SIZE, bytesSent)) > 0) {
      server.sendRaw(buf.subarray(0, bytesRead));
      bytesSent += bytesRead;
      const percent = 30 + Math.round((bytesSent / fileSize) * 65);
      const speedMB = bytesSent / (1024 * 1024);
      mainWindow?.webContents.send('transfer:progress', {
        percent,
        file: `正在传输... ${Math.round(bytesSent / fileSize * 100)}%`,
        bytesSent,
        totalBytes: fileSize
      });
    }
    fs.closeSync(fd);

    server.send({ type: 'file_end', payload: { name: 'bundle.tar.gz' } });
    mainWindow?.webContents.send('transfer:progress', { percent: 100, file: '传输完成' });

    // Clean up temp file
    try { fs.unlinkSync(bundlePath); } catch {}

    return { success: true, stats: { fileCount: scanResult.manifest.sections.files?.count || 0, totalSize: fileSize } };
  } catch (e: any) {
    server.send({ type: 'error', payload: e.message });
    return { success: false, error: e.message };
  }
});

// ==================== Import (Target) ====================

ipcMain.handle('import:start', async () => {
  if (!client?.ready) return { success: false, error: '未连接到源电脑' };

  try {
    mainWindow?.webContents.send('import:progress', { percent: 0, file: '等待接收数据...' });
    client.send('ready');

    // Wait for file to arrive
    const filePath = await client.waitForFile();
    mainWindow?.webContents.send('import:progress', { percent: 50, file: '正在解包...' });

    const outDir = path.join(os.tmpdir(), 'pcmig_import');
    const { manifest } = await extractBundle(filePath, outDir, (p) => {
      mainWindow?.webContents.send('import:progress', {
        percent: 50 + Math.round(p.percent * 0.3),
        file: p.currentFile
      });
    });

    // Run import scripts
    mainWindow?.webContents.send('import:progress', { percent: 80, file: '正在导入数据...' });

    if (manifest.sections.browser) {
      const browserDir = path.join(outDir, 'browser');
      if (fs.existsSync(browserDir)) {
        // Try Chrome import first
        await runScript('browser/import-browser.ps1', ['-SourceDir', browserDir, '-Browser', 'chrome']);
      }
    }

    if (manifest.sections.system_settings) {
      const settingsDir = path.join(outDir, 'system_settings');
      if (fs.existsSync(settingsDir)) {
        await runScript('system/import-settings.ps1', ['-SourceDir', settingsDir]);
      }
    }

    mainWindow?.webContents.send('import:progress', { percent: 100, file: '导入完成' });

    // Clean up
    try { fs.rmSync(outDir, { recursive: true }); } catch {}
    try { fs.unlinkSync(filePath); } catch {}

    return { success: true, stats: { fileCount: manifest.sections.files?.count || 0, totalSize: manifest.total_size } };
  } catch (e: any) {
    mainWindow?.webContents.send('import:error', e.message);
    return { success: false, error: e.message };
  }
});

// ==================== Cleanup ====================

function cleanup() {
  stopBroadcast?.();
  stopBroadcast = null;
  stopDiscovery?.();
  stopDiscovery = null;
  server?.stop();
  server = null;
  client?.disconnect();
  client = null;
}

ipcMain.handle('pairing:cancel', async () => cleanup());
ipcMain.handle('cleanup', async () => cleanup());

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
