import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface FileEntry {
  path: string;
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
