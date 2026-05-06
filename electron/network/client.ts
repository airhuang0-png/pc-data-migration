import { WebSocket } from 'ws';

export class MigrationClient {
  private ws: WebSocket | null = null;
  private messageHandlers: Map<string, (payload: unknown) => void> = new Map();

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
    this.ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        const handler = this.messageHandlers.get(msg.type);
        if (handler) handler(msg.payload);
      } catch { /* skip malformed messages */ }
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

  get ready(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  disconnect() {
    this.ws?.removeAllListeners();
    this.ws?.close();
    this.ws = null;
    this.messageHandlers.clear();
  }
}
