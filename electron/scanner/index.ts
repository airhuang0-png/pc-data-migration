import { scanFiles, FileCategory } from './file-scanner';
import { buildPreview, PreviewSection } from './category-resolver';
import { runScript } from '../powershell/runner';
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
  onProgress?.('system', '正在获取系统信息...');

  const source: ManifestSource = {
    hostname: os.hostname(),
    os: `Windows ${os.release()}`,
    os_version: os.release(),
    arch: process.arch,
    username: os.userInfo().username
  };

  onProgress?.('files', '正在扫描文件...');
  const fileCategories = scanFiles((cat, count) => {
    onProgress?.('files', `${cat}: ${count} 个文件`);
  });

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

  const preview = buildPreview(fileCategories, browserSize, appConfigSize, systemSettingsSize);

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
