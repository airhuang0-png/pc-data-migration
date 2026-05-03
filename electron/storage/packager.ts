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

  const manifestJson = serializeManifest(scanResult.manifest);
  pack.entry({ name: 'manifest.json', size: Buffer.byteLength(manifestJson) }, manifestJson);

  const totalBytes = scanResult.manifest.total_size;
  let bytesWritten = 0;

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
