import Fastify from 'fastify';
import cors from '@fastify/cors';
import dotenv from 'dotenv';
import { authRoutes } from './routes/auth.js';
import { menuRoutes } from './routes/menu.js';
import { orderRoutes } from './routes/orders.js';
import { storeRoutes } from './routes/store.js';
import { waiterTableRoutes } from './routes/waiterTables.js';
import { getMqttClient } from './lib/mqtt.js';

dotenv.config();

const PORT = parseInt(process.env.PORT || '8787', 10);
const CORS_ORIGINS = process.env.CORS_ORIGINS?.split(',') || ['http://localhost:5173'];

const fastify = Fastify({
  logger: true,
  trustProxy: true,
});

// CORS
await fastify.register(cors, {
  origin: CORS_ORIGINS,
  credentials: true,
});

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
