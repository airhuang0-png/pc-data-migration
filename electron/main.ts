import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { MigrationServer } from './network/server';
import { MigrationClient } from './network/client';
import { startAdvertising, discoverServers } from './network/mdns';

let mainWindow: BrowserWindow | null = null;
let server: MigrationServer | null = null;
let client: MigrationClient | null = null;
let stopAdvertising: (() => void) | null = null;
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

// --- Pairing: Source (server) ---
ipcMain.handle('pairing:generate', async () => {
  if (server) {
    return { error: '已在等待连接中' };
  }
  try {
    server = new MigrationServer();
    const { port, session } = await server.start(() => {
      // Client connected — notify renderer
      mainWindow?.webContents.send('pairing:ready');
    });
    stopAdvertising = startAdvertising(port);
    return { code: session.code, port };
  } catch (e: any) {
    return { error: e.message };
  }
});

// --- Pairing: Target (client) ---
ipcMain.handle('pairing:connect', async (_event, code: string) => {
  return new Promise((resolve) => {
    let resolved = false;

    stopDiscovery = discoverServers(async (info) => {
      if (resolved) return;
      resolved = true;

      try {
        if (stopDiscovery) {
          stopDiscovery();
          stopDiscovery = null;
        }

        client = new MigrationClient();
        const ok = await client.connect(info.host, info.port, code);

        if (ok) {
          resolve({ success: true, host: info.host, port: info.port });
        } else {
          resolve({ success: false, error: '配对码错误或已过期' });
        }
      } catch (e: any) {
        resolve({ success: false, error: e.message });
      }
    });

    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        if (stopDiscovery) {
          stopDiscovery();
          stopDiscovery = null;
        }
        resolve({ success: false, error: '未在局域网中找到发送端' });
      }
    }, 15000);
  });
});

// --- Cleanup ---
ipcMain.handle('pairing:cancel', async () => {
  if (stopAdvertising) {
    stopAdvertising();
    stopAdvertising = null;
  }
  if (stopDiscovery) {
    stopDiscovery();
    stopDiscovery = null;
  }
  if (server) {
    server.stop();
    server = null;
  }
  if (client) {
    client.disconnect();
    client = null;
  }
});

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
