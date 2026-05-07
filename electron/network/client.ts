import { WebSocket } from 'ws';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export class MigrationClient {
  private ws: WebSocket | null = null;
  private messageHandlers: Map<string, (payload: unknown) => void> = new Map();
  private receiveChunks: Buffer[] = [];
  private receiveFileName: string | null = null;
  private receiveResolve: ((p: string) => void) | null = null;
  private receivedFilePath: string | null = null;

  connect(host: string, port: number, code: string): Promise<boolean> {
    return new Promise((resolve) => {
      this.ws = new WebSocket(`ws://${host}:${port}`);

      const timeout = setTimeout(() => {
        this.ws?.close();
        resolve(false);
      }, 10000);

      this.ws.on('open', () => {
        this.ws!.send(JSON.stringify({ type: 'pair', code }));
      });

      this.ws.once('message', (data) => {
        const msg = JSON.parse(data.toString());
        const ok = msg.type === 'paired' && msg.payload?.ok === true;
        if (ok) {
          clearTimeout(timeout);
          this.setupMessageDispatch();
        }
        resolve(ok);
      });

      this.ws.on('error', () => {
        clearTimeout(timeout);
        resolve(false);
      });
    });
  }

  private setupMessageDispatch() {
    if (!this.ws) return;

    this.ws.on('message', (data: Buffer) => {
      // ws library sends TEXT as string, BINARY as Buffer
      // But in practice, JSON strings may come as Buffer too
      if (Buffer.isBuffer(data) && data.length > 0) {
        // Peek: if first byte is '{', treat as JSON text
        if (data[0] === 0x7B) {
          try {
            const msg = JSON.parse(data.toString());
            this.dispatchMessage(msg);
            return;
          } catch { /* fall through */ }
        }
        // Binary chunk
        if (this.receiveChunks) {
          this.receiveChunks.push(data);
        }
        return;
      }

      // String text frame
      try {
        const msg = JSON.parse(data.toString());
        this.dispatchMessage(msg);
      } catch { /* skip */ }
    });
  }

  private dispatchMessage(msg: any) {
    if (msg.type === 'file_start') {
      this.receiveChunks = [];
      this.receiveFileName = msg.payload?.name || 'bundle.tar.gz';
      // Notify handlers (used for auto-starting import)
      const handler = this.messageHandlers.get('file_start');
      if (handler) handler(msg.payload);
    } else if (msg.type === 'file_end') {
      if (this.receiveChunks && this.receiveChunks.length > 0 && this.receiveFileName) {
        const fileBuf = Buffer.concat(this.receiveChunks);
        const outDir = path.join(os.tmpdir(), 'pcmig_receive');
        fs.mkdirSync(outDir, { recursive: true });
        const outPath = path.join(outDir, this.receiveFileName);
        fs.writeFileSync(outPath, fileBuf);
        this.receiveChunks = [];
        this.receiveFileName = null;
        // Resolve any pending waiter
        if (this.receiveResolve) {
          this.receiveResolve(outPath);
          this.receiveResolve = null;
        } else {
          // File arrived before waitForFile was called — store it
          this.receivedFilePath = outPath;
        }
      }
    } else {
      const handler = this.messageHandlers.get(msg.type);
      if (handler) handler(msg.payload);
    }
  }

  /** Wait for a file to be received. If already received, returns immediately. */
  waitForFile(): Promise<string> {
    // Already received before this call
    if (this.receivedFilePath) {
      const p = this.receivedFilePath;
      this.receivedFilePath = null;
      return Promise.resolve(p);
    }
    return new Promise((resolve) => {
      this.receiveResolve = resolve;
    });
  }

  on(messageType: string, handler: (payload: unknown) => void) {
    this.messageHandlers.set(messageType, handler);
  }

  send(type: string, payload?: unknown) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, payload }));
    }
  }

  sendRaw(data: Buffer) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(data);
    }
  }

  get ready(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  disconnect() {
    this.ws?.removeAllListeners();
    this.ws?.close();
    this.ws = null;
    this.messageHandlers.clear();
    this.receiveChunks = [];
    this.receiveResolve = null;
    this.receivedFilePath = null;
  }
}
