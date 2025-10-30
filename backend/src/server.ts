import Fastify from 'fastify';
import cors from '@fastify/cors';
import dotenv from 'dotenv';
import { authRoutes } from './routes/auth.js';
import { menuRoutes } from './routes/menu.js';
import { orderRoutes } from './routes/orders.js';
import { storeRoutes } from './routes/store.js';
import { waiterTableRoutes } from './routes/waiterTables.js';
import { managerRoutes } from './routes/manager.js';
import { getMqttClient } from './lib/mqtt.js';
import { webhookRoutes } from './routes/webhooks.js';

dotenv.config();

const PORT = parseInt(process.env.PORT || '8787', 10);
// CORS configuration with sensible fallbacks for production deploys
const CORS_ENV = process.env.CORS_ORIGINS; // comma-separated list or '*'
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN; // optional single origin
const IS_PROD = process.env.NODE_ENV === 'production' || Boolean(process.env.RENDER);

let corsOrigin: boolean | string[] = ['http://localhost:5173'];
if (CORS_ENV && CORS_ENV.trim().length > 0) {
  if (CORS_ENV.trim() === '*') {
    corsOrigin = true;
  } else {
    corsOrigin = CORS_ENV.split(',').map((s) => s.trim()).filter(Boolean);
  }
} else if (FRONTEND_ORIGIN && FRONTEND_ORIGIN.trim().length > 0) {
  corsOrigin = [FRONTEND_ORIGIN.trim()];
} else if (IS_PROD) {
  // As a last resort in production, allow all to avoid misconfig deploys.
  // For stricter security, set CORS_ORIGINS or FRONTEND_ORIGIN envs.
  corsOrigin = true;
}

const fastify = Fastify({
  logger: process.env.LOG_LEVEL ? { level: process.env.LOG_LEVEL } : true,
  trustProxy: true,
});

// CORS
await fastify.register(cors, {
  origin: corsOrigin,
  credentials: true,
});
fastify.log.info({ corsOrigin }, 'CORS configured');

// Health check
fastify.get('/health', async (request, reply) => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// Register routes
await fastify.register(authRoutes);
await fastify.register(storeRoutes);
await fastify.register(menuRoutes);
await fastify.register(orderRoutes);
await fastify.register(waiterTableRoutes);
await fastify.register(managerRoutes);
await fastify.register(webhookRoutes);

// Initialize MQTT
getMqttClient();

// Start server
try {
  await fastify.listen({ port: PORT, host: '0.0.0.0' });
  console.log(`Server listening on port ${PORT}`);
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
