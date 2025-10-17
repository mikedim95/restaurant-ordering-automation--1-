import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../db/index.js';
import { orders, orderItems, tables } from '../db/schema.js';
import { eq, and, or, desc } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth.js';
import { ipWhitelistMiddleware } from '../middleware/ipWhitelist.js';
import { publishMessage } from '../lib/mqtt.js';

const STORE_SLUG = process.env.STORE_SLUG || 'demo-cafe';

const createOrderSchema = z.object({
  tableId: z.string().uuid(),
  items: z.array(z.object({
    itemId: z.string().uuid(),
    quantity: z.number().int().positive(),
    priceCents: z.number().int(),
    modifiers: z.string().optional(),
  })),
  totalCents: z.number().int(),
  note: z.string().optional(),
});

const updateStatusSchema = z.object({
  status: z.enum(['PLACED', 'PREPARING', 'READY', 'SERVED', 'CANCELLED']),
});

export async function orderRoutes(fastify: FastifyInstance) {
  // Create order (IP whitelisted)
  fastify.post('/orders', {
    preHandler: [ipWhitelistMiddleware],
  }, async (request, reply) => {
    try {
      const body = createOrderSchema.parse(request.body);

      // Insert order
      const [order] = await db.insert(orders).values({
        tableId: body.tableId,
        status: 'PLACED',
        totalCents: body.totalCents,
        note: body.note,
      }).returning();

      // Insert order items
      const itemsToInsert = body.items.map(item => ({
        orderId: order.id,
        itemId: item.itemId,
        quantity: item.quantity,
        priceCents: item.priceCents,
        modifiers: item.modifiers,
      }));

      await db.insert(orderItems).values(itemsToInsert);

      // Get table label for printing
      const [table] = await db.select().from(tables).where(eq(tables.id, body.tableId)).limit(1);

      // Publish to printing topic
      publishMessage(`stores/${STORE_SLUG}/printing`, {
        orderId: order.id,
        tableLabel: table?.label || 'Unknown',
        createdAt: order.createdAt,
        items: body.items,
        totalCents: body.totalCents,
        note: body.note,
      });

      return reply.status(201).send({ orderId: order.id });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Invalid request', details: error.errors });
      }
      console.error('Create order error:', error);
      return reply.status(500).send({ error: 'Failed to create order' });
    }
  });

  // Get orders (protected)
  fastify.get('/orders', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    try {
      const user = (request as any).user;
      const query: any = request.query;

      let ordersQuery = db.select().from(orders);

      // Filter by status if provided
      if (query.status) {
        ordersQuery = ordersQuery.where(eq(orders.status, query.status));
      }

      // Waiters only see orders for their assigned tables
      if (user.role === 'waiter') {
        // TODO: Join with waiter_tables to filter
      }

      const ordersData = await ordersQuery.orderBy(desc(orders.createdAt)).limit(100);

      return reply.send({ orders: ordersData });
    } catch (error) {
      console.error('Get orders error:', error);
      return reply.status(500).send({ error: 'Failed to fetch orders' });
    }
  });

  // Update order status (protected)
  fastify.patch('/orders/:id/status', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const body = updateStatusSchema.parse(request.body);

      const [order] = await db.update(orders)
        .set({ status: body.status, updatedAt: new Date() })
        .where(eq(orders.id, id))
        .returning();

      if (!order) {
        return reply.status(404).send({ error: 'Order not found' });
      }

      // If status is READY, publish to customer notification topic
      if (body.status === 'READY') {
        publishMessage(`stores/${STORE_SLUG}/tables/${order.tableId}/ready`, {
          orderId: order.id,
          tableId: order.tableId,
          status: 'READY',
          ts: new Date().toISOString(),
        });
      }

      return reply.send({ order });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Invalid request', details: error.errors });
      }
      console.error('Update order status error:', error);
      return reply.status(500).send({ error: 'Failed to update order status' });
    }
  });

  // Call waiter (IP whitelisted)
  fastify.post('/call-waiter', {
    preHandler: [ipWhitelistMiddleware],
  }, async (request, reply) => {
    try {
      const body = z.object({ tableId: z.string().uuid() }).parse(request.body);

      publishMessage(`stores/${STORE_SLUG}/tables/${body.tableId}/call`, {
        tableId: body.tableId,
        ts: new Date().toISOString(),
      });

      return reply.send({ success: true });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Invalid request', details: error.errors });
      }
      console.error('Call waiter error:', error);
      return reply.status(500).send({ error: 'Failed to call waiter' });
    }
  });
}
