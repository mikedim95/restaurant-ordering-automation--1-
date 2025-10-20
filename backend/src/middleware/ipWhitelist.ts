import { FastifyRequest, FastifyReply } from 'fastify';

const ALLOWED_IPS = (process.env.ALLOWED_IPS || '127.0.0.1,::1,::ffff:127.0.0.1')
  .split(',')
  .map(ip => ip.trim());
const ALLOW_ALL = ALLOWED_IPS.includes('*');

export async function ipWhitelistMiddleware(request: FastifyRequest, reply: FastifyReply) {
  const clientIp = request.headers['x-forwarded-for'] 
    ? (request.headers['x-forwarded-for'] as string).split(',')[0].trim()
    : request.ip;

  if (ALLOW_ALL) {
    return; // allow all
  }

  console.log('Client IP:', clientIp, 'Allowed:', ALLOWED_IPS);

  if (!ALLOWED_IPS.includes(clientIp)) {
    return reply.status(403).send({ error: 'Access denied: IP not whitelisted' });
  }
}
