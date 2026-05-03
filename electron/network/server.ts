import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { generatePairingCode, validatePairingCode, PairingSession } from './pairing';

export interface TransferMessage {
  type: 'manifest' | 'chunk' | 'complete' | 'error' | 'cancel';
  payload?: unknown;
}

export class MigrationServer {
  private wss: WebSocketServer | null = null;
  private session: PairingSession | null = null;
  private clientSocket: WebSocket | null = null;
  private port: number = 0;
  private httpServer: ReturnType<typeof createServer> | null = null;

  async start(): Promise<{ port: number; session: PairingSession }> {
    this.session = generatePairingCode();

    this.httpServer = createServer();
    this.wss = new WebSocketServer({ server: this.httpServer });

    this.wss.on('connection', (ws) => {
      ws.once('message', (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'pair' && validatePairingCode(this.session!, msg.code)) {
          this.clientSocket = ws;
          ws.send(JSON.stringify({ type: 'paired', payload: { ok: true } }));
          this.handleClient(ws);
        } else {
          ws.send(JSON.stringify({ type: 'error', payload: 'Invalid or expired pairing code' }));
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

  private handleClient(ws: WebSocket) {
    ws.on('message', (data) => {
      const msg: TransferMessage = JSON.parse(data.toString());
      if (msg.type === 'cancel') {
        this.clientSocket = null;
      }
    });
  }

  send(msg: TransferMessage) {
    if (this.clientSocket?.readyState === WebSocket.OPEN) {
      this.clientSocket.send(JSON.stringify(msg));
    }
  }

  stop() {
    this.clientSocket?.close();
    this.wss?.close();
    this.httpServer?.close();
    this.session = null;
    this.clientSocket = null;
  }
}
