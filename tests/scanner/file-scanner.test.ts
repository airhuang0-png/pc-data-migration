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
