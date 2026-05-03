import { createReadStream } from 'fs';
import { createGunzip } from 'zlib';
import * as path from 'path';
import * as fs from 'fs';
import * as tar from 'tar-stream';
import { deserializeManifest, Manifest } from './manifest';

export interface ExtractResult {
  manifest: Manifest;
  outputDir: string;
}

export function extractBundle(
  bundlePath: string,
  outputDir: string,
  onProgress?: (p: { percent: number; currentFile: string }) => void,
  conflictStrategy: 'skip' | 'rename' | 'overwrite' = 'skip'
): Promise<ExtractResult> {
  return new Promise((resolve, reject) => {
    const extract = tar.extract();
    const readStream = createReadStream(bundlePath);
    let manifest: Manifest | null = null;
    let totalFiles = 0;
    let processedFiles = 0;
    const entries: Promise<void>[] = [];

    readStream.pipe(createGunzip()).pipe(extract);

    extract.on('entry', (header, stream, next) => {
      totalFiles++;
      const fullPath = path.join(outputDir, header.name);

      if (header.name === 'manifest.json') {
        let buf = '';
        stream.on('data', (chunk: Buffer) => { buf += chunk.toString(); });
        stream.on('end', () => {
          manifest = deserializeManifest(buf);
          processedFiles++;
          next();
        });
        return;
      }

      if (header.type === 'directory') {
        entries.push(
          fs.promises.mkdir(fullPath, { recursive: true }).then(() => { processedFiles++; })
        );
        stream.resume();
        next();
        return;
      }

      const parentDir = path.dirname(fullPath);

      const restoreEntry = async () => {
        await fs.promises.mkdir(parentDir, { recursive: true });

        if (conflictStrategy === 'skip' && fs.existsSync(fullPath)) {
          processedFiles++;
          stream.resume();
          return;
        }

        if (conflictStrategy === 'rename' && fs.existsSync(fullPath)) {
          const ext = path.extname(fullPath);
          const base = fullPath.slice(0, -ext.length);
          let counter = 2;
          while (fs.existsSync(`${base}(${counter})${ext}`)) counter++;
          const newPath = `${base}(${counter})${ext}`;
          const ws = fs.createWriteStream(newPath);
          stream.pipe(ws);
          await new Promise(r => ws.on('close', r));
          processedFiles++;
          return;
        }

        const ws = fs.createWriteStream(fullPath);
        stream.pipe(ws);
        await new Promise(r => ws.on('close', r));
        processedFiles++;
      };

      entries.push(restoreEntry());
      onProgress?.({
        percent: totalFiles > 0 ? Math.round((processedFiles / totalFiles) * 100) : 0,
        currentFile: header.name
      });
      next();
    });

    extract.on('finish', async () => {
      await Promise.all(entries);
      if (!manifest) return reject(new Error('No manifest found in bundle'));
      resolve({ manifest, outputDir });
    });

    extract.on('error', reject);
  });
}
