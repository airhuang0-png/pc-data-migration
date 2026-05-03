import * as fs from 'fs';
import * as path from 'path';

const FAT32_MAX_FILE = 4 * 1024 * 1024 * 1024 - 1;
const CHUNK_SIZE = 256 * 1024 * 1024;

export function splitFile(
  filePath: string,
  onProgress?: (part: number, total: number) => void
): string[] {
  const stat = fs.statSync(filePath);
  const totalParts = Math.ceil(stat.size / FAT32_MAX_FILE);
  const parts: string[] = [];

  if (totalParts <= 1) return [filePath];

  const fd = fs.openSync(filePath, 'r');
  const buffer = Buffer.alloc(CHUNK_SIZE);

  for (let i = 0; i < totalParts; i++) {
    const partPath = `${filePath}.${String(i + 1).padStart(3, '0')}`;
    const partFd = fs.openSync(partPath, 'w');
    const partStart = i * FAT32_MAX_FILE;
    const partEnd = Math.min((i + 1) * FAT32_MAX_FILE, stat.size);
    let offset = partStart;

    while (offset < partEnd) {
      const readSize = Math.min(CHUNK_SIZE, partEnd - offset);
      const bytesRead = fs.readSync(fd, buffer, 0, readSize, offset);
      fs.writeSync(partFd, buffer, 0, bytesRead);
      offset += bytesRead;
    }

    fs.closeSync(partFd);
    parts.push(partPath);
    onProgress?.(i + 1, totalParts);
  }

  fs.closeSync(fd);
  return parts;
}

export function mergeFiles(partPattern: string, outputPath: string, totalParts: number): void {
  const outFd = fs.openSync(outputPath, 'w');
  const buffer = Buffer.alloc(CHUNK_SIZE);

  for (let i = 0; i < totalParts; i++) {
    const partPath = partPattern.replace('*', String(i + 1).padStart(3, '0'));
    const partFd = fs.openSync(partPath, 'r');
    const partStat = fs.statSync(partPath);
    let remaining = partStat.size;
    let offset = 0;

    while (remaining > 0) {
      const readSize = Math.min(CHUNK_SIZE, remaining);
      const bytesRead = fs.readSync(partFd, buffer, 0, readSize, offset);
      fs.writeSync(outFd, buffer, 0, bytesRead);
      remaining -= bytesRead;
      offset += bytesRead;
    }

    fs.closeSync(partFd);
  }

  fs.closeSync(outFd);
}

export function detectFileSystem(targetPath: string): 'FAT32' | 'NTFS' | 'exFAT' | 'unknown' {
  return 'NTFS';
}
