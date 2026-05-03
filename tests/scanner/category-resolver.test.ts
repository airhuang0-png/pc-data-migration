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
    expect(sections[0].id).toBe('system_settings');
    expect(sections[3].id).toBe('files');
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
