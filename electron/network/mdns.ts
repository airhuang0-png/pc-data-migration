import createMdns from 'multicast-dns';

const SERVICE_TYPE = '_pcmigrate._tcp.local';

export function startAdvertising(port: number): () => void {
  const mdns = createMdns();

  mdns.on('query', (query: any) => {
    for (const q of query.questions) {
      if (q.name === SERVICE_TYPE && q.type === 'PTR') {
        mdns.respond({
          answers: [{
            name: SERVICE_TYPE,
            type: 'PTR',
            class: 1 as any,
            ttl: 120,
            data: `PC迁移助手._pcmigrate._tcp.local`
          }, {
            name: `PC迁移助手._pcmigrate._tcp.local`,
            type: 'SRV',
            class: 1 as any,
            ttl: 120,
            data: { port, target: 'localhost' }
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
    for (const answer of response.answers) {
      if (answer.name === SERVICE_TYPE && answer.type === 'PTR') {
        const srvAnswer = response.answers.find(
          (a: any) => a.type === 'SRV'
        );
        if (srvAnswer && 'data' in srvAnswer && srvAnswer.data && typeof srvAnswer.data === 'object' && 'port' in srvAnswer.data) {
          const port = (srvAnswer.data as { port: number }).port;
          onFound({ host: 'localhost', port });
        }
      }
    }
  });

  mdns.query(SERVICE_TYPE, 'PTR');
  return () => mdns.destroy();
}
