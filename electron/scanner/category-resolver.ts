import { FileCategory } from './file-scanner';

export type SectionId = 'files' | 'browser' | 'app_configs' | 'system_settings';

export interface PreviewSection {
  id: SectionId;
  label: string;
  size: number;
  selected: boolean;
  priority: number;
  children?: PreviewSection[];
}

export function buildPreview(
  fileCategories: FileCategory[],
  browserSize: number,
  appConfigSize: number,
  systemSettingsSize: number
): PreviewSection[] {
  const sections: PreviewSection[] = [];

  sections.push({
    id: 'system_settings',
    label: '系统设置',
    size: systemSettingsSize,
    selected: true,
    priority: 0
  });

  sections.push({
    id: 'browser',
    label: '浏览器数据',
    size: browserSize,
    selected: true,
    priority: 1
  });

  sections.push({
    id: 'app_configs',
    label: '应用配置',
    size: appConfigSize,
    selected: true,
    priority: 2
  });

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
    if (copy.id !== 'files') {
      used += copy.size;
      copy.selected = true;
      return copy;
    }
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
