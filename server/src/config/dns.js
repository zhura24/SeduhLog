import dns from 'node:dns';

export function configureDnsResolver(value = process.env.MONGODB_DNS_SERVERS) {
  const servers = value?.split(',').map(server => server.trim()).filter(Boolean);
  if (servers?.length) dns.setServers(servers);
}
