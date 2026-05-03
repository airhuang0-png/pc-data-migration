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
  root: string;
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
