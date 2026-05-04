import { WebSocket } from 'ws';

export class MigrationClient {
  private ws: WebSocket | null = null;
  private messageHandlers: Map<string, (payload: unknown) => void> = new Map();

  connect(host: string, port: number, code: string): Promise<boolean> {
    return new Promise((resolve) => {
      this.ws = new WebSocket(`ws://${host}:${port}`);

      this.ws.on('open', () => {
        this.ws!.send(JSON.stringify({ type: 'pair', code }));
      });

      this.ws.once('message', (data) => {
        const msg = JSON.parse(data.toString());
        resolve(msg.type === 'paired' && msg.payload?.ok === true);
      });

      this.ws.on('error', () => resolve(false));
      setTimeout(() => resolve(false), 10000);
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

  disconnect() {
    this.ws?.close();
    this.ws = null;
    this.messageHandlers.clear();
  }
}
