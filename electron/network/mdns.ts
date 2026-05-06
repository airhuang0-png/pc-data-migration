import createMdns from 'multicast-dns';
import * as os from 'os';

const SERVICE_TYPE = '_pcmigrate._tcp.local';
const SERVICE_NAME = 'PC迁移助手._pcmigrate._tcp.local';

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

export function startAdvertising(port: number): () => void {
  const mdns = createMdns();
  const localIP = getLocalIP();

  mdns.on('query', (query: any) => {
    for (const q of query.questions) {
      if (q.name === SERVICE_TYPE && q.type === 'PTR') {
        mdns.respond({
          answers: [{
            name: SERVICE_TYPE,
            type: 'PTR',
            class: 1 as any,
            ttl: 120,
            data: SERVICE_NAME
          }, {
            name: SERVICE_NAME,
            type: 'SRV',
            class: 1 as any,
            ttl: 120,
            data: { port, target: localIP }
          }]
        });
      }
    }
  });

  return () => mdns.destroy();
}

export function discoverServers(onFound: (info: { host: string; port: number }) => void): () => void {
  const mdns = createMdns();

  mdns.on('response', (response: any) => {
    let srvTarget: string | null = null;
    let srvPort: number | null = null;

    for (const answer of response.answers) {
      if (answer.name === SERVICE_NAME && answer.type === 'SRV') {
        if (answer.data && typeof answer.data === 'object' && 'port' in answer.data && 'target' in answer.data) {
          srvPort = (answer.data as { port: number }).port;
          srvTarget = (answer.data as { target: string }).target;
        }
      }
    }

    if (srvTarget && srvPort) {
      onFound({ host: srvTarget, port: srvPort });
    }
  });

  mdns.query(SERVICE_TYPE, 'PTR');
  return () => mdns.destroy();
}
