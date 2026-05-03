import { execFile } from 'child_process';
import path from 'path';
import { app } from 'electron';

export interface PsResult {
  success: boolean;
  data?: string;
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
