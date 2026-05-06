import * as dgram from 'dgram';
import * as os from 'os';

const DISCOVERY_PORT = 54321;
const BROADCAST_INTERVAL = 2000;
const DISCOVERY_TIMEOUT = 15000;

function getLocalIP(): string {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]!) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return '127.0.0.1';
}

export function startBroadcast(port: number): () => void {
  const socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
  const localIP = getLocalIP();
  let running = true;

  socket.bind(() => {
    socket.setBroadcast(true);

    const broadcast = () => {
      if (!running) return;
      const msg = JSON.stringify({ type: 'pcmigrate', host: localIP, port });
      socket.send(msg, DISCOVERY_PORT, '255.255.255.255');
    };

    broadcast();
    const timer = setInterval(broadcast, BROADCAST_INTERVAL);

    socket.on('close', () => {
      running = false;
      clearInterval(timer);
    });
  });

  return () => socket.close();
}

export function startDiscovery(onFound: (info: { host: string; port: number }) => void): () => void {
  const socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
  let stopped = false;

  socket.bind(DISCOVERY_PORT, () => {
    socket.on('message', (data, rinfo) => {
      if (stopped) return;
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'pcmigrate' && msg.host && msg.port) {
          // Ignore broadcasts from our own machine
          if (msg.host !== getLocalIP()) {
            onFound({ host: msg.host, port: msg.port });
          }
        }
      } catch { /* skip */ }
    });
  });

  return () => {
    stopped = true;
    socket.close();
  };
}
