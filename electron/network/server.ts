import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { generatePairingCode, validatePairingCode, PairingSession } from './pairing';

export interface TransferMessage {
  type: 'manifest' | 'chunk' | 'complete' | 'error' | 'cancel' | 'file_start' | 'file_end';
  payload?: unknown;
}

export class MigrationServer {
  private wss: WebSocketServer | null = null;
  private session: PairingSession | null = null;
  private clientSocket: WebSocket | null = null;
  private port: number = 0;
  private httpServer: ReturnType<typeof createServer> | null = null;
  private onPaired: (() => void) | null = null;
  private onMessage: ((msg: TransferMessage) => void) | null = null;

  async start(onPaired?: () => void): Promise<{ port: number; session: PairingSession }> {
    this.session = generatePairingCode();
    this.onPaired = onPaired || null;

    this.httpServer = createServer();
    this.wss = new WebSocketServer({ server: this.httpServer });

    this.wss.on('connection', (ws) => {
      ws.once('message', (data) => {
        try {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'pair' && this.session && validatePairingCode(this.session, msg.code)) {
            this.clientSocket = ws;
            ws.send(JSON.stringify({ type: 'paired', payload: { ok: true } }));
            this.handleClient(ws);
            this.onPaired?.();
          } else {
            ws.send(JSON.stringify({ type: 'error', payload: '配对码错误或已过期' }));
            ws.close();
          }
        } catch {
          ws.send(JSON.stringify({ type: 'error', payload: '无效消息' }));
          ws.close();
        }
      });
    });

    return new Promise((resolve, reject) => {
      this.httpServer!.listen(0, () => {
        const addr = this.httpServer!.address();
        if (addr && typeof addr !== 'string') {
          this.port = addr.port;
          resolve({ port: this.port, session: this.session! });
        } else {
          reject(new Error('Failed to get server address'));
        }
      });
      this.httpServer!.on('error', reject);
    });
  }

  onClientMessage(handler: (msg: TransferMessage) => void) {
    this.onMessage = handler;
  }

  private handleClient(ws: WebSocket) {
    ws.on('message', (data) => {
      try {
        const msg: TransferMessage = JSON.parse(data.toString());
        if (msg.type === 'cancel') {
          this.clientSocket = null;
        }
        this.onMessage?.(msg);
      } catch { /* skip */ }
    });
  }

  send(msg: TransferMessage) {
    if (this.clientSocket?.readyState === WebSocket.OPEN) {
      this.clientSocket.send(JSON.stringify(msg));
    }
  }

  sendRaw(data: Buffer) {
    if (this.clientSocket?.readyState === WebSocket.OPEN) {
      this.clientSocket.send(data);
    }
  }

  get connected(): boolean {
    return this.clientSocket !== null && this.clientSocket.readyState === WebSocket.OPEN;
  }

  stop() {
    this.clientSocket?.close();
    this.wss?.close();
    this.httpServer?.close();
    this.session = null;
    this.clientSocket = null;
    this.onMessage = null;
  }
}
