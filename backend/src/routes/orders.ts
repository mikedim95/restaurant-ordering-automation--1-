import { FastifyInstance } from "fastify";
import { Prisma, OrderStatus } from "@prisma/client";
import { z } from "zod";
import { db } from "../db/index.js";
import { authMiddleware } from "../middleware/auth.js";
import { ipWhitelistMiddleware } from "../middleware/ipWhitelist.js";
import { publishMessage } from "../lib/mqtt.js";
import { ensureStore, STORE_SLUG } from "../lib/store.js";

const modifierSelectionSchema = z.record(z.string());

const createOrderSchema = z.object({
  tableId: z.string().uuid(),
  items: z
    .array(
      z.object({
        itemId: z.string().uuid(),
        quantity: z.number().int().positive(),
        modifiers: z.union([z.string(), modifierSelectionSchema]).optional(),
      })
    )
    .min(1),
  note: z.string().max(500).optional(),
});

const updateStatusSchema = z.object({
  status: z.nativeEnum(OrderStatus),
});

const callWaiterSchema = z.object({
  tableId: z.string().uuid(),
});

type OrderWithRelations = Prisma.OrderGetPayload<{
  include: {
    table: { select: { id: true; label: true } };
    orderItems: {
      include: {
        orderItemOptions: true;
      };
    };
  };
}>;

function serializeOrder(order: OrderWithRelations) {
  return {
    id: order.id,
    tableId: order.tableId,
    tableLabel: order.table?.label ?? "Unknown",
    status: order.status,
    note: order.note,
    totalCents: order.totalCents,
    total: order.totalCents / 100,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    items: order.orderItems.map((orderItem) => ({
      id: orderItem.id,
      itemId: orderItem.itemId,
      title: orderItem.titleSnapshot,
      unitPriceCents: orderItem.unitPriceCents,
      unitPrice: orderItem.unitPriceCents / 100,
      quantity: orderItem.quantity,
      modifiers: orderItem.orderItemOptions.map((option) => ({
        id: option.id,
        modifierId: option.modifierId,
        modifierOptionId: option.modifierOptionId,
        title: option.titleSnapshot,
        priceDeltaCents: option.priceDeltaCents,
        priceDelta: option.priceDeltaCents / 100,
      })),
    })),
  };
}

function parseModifiers(value?: unknown) {
  if (!value) {
    return {} as Record<string, string>;
  }

  if (typeof value === "string") {
    if (value.trim().length === 0) {
      return {} as Record<string, string>;
    }

    try {
      const parsed = JSON.parse(value);
      return modifierSelectionSchema.parse(parsed);
    } catch (error) {
      throw new Error("Invalid modifiers payload");
    }
  }

  return modifierSelectionSchema.parse(value);
}

export async function orderRoutes(fastify: FastifyInstance) {
  // Create order (IP whitelisted)
  fastify.post(
    "/orders",
    {
      preHandler: [ipWhitelistMiddleware],
    },
    async (request, reply) => {
      try {
        const body = createOrderSchema.parse(request.body);
        const store = await ensureStore();

        const table = await db.table.findFirst({
          where: { id: body.tableId, storeId: store.id },
        });

        if (!table) {
          return reply.status(404).send({ error: "Table not found" });
        }

        const itemIds = body.items.map((item) => item.itemId);
        const items = await db.item.findMany({
          where: {
            storeId: store.id,
            id: { in: itemIds },
            isAvailable: true,
          },
          include: {
            itemModifiers: {
              include: {
                modifier: {
                  include: {
                    modifierOptions: true,
                  },
                },
              },
            },
          },
        });

        const itemMap = new Map(items.map((item) => [item.id, item]));

        let orderTotalCents = 0;
        const orderItemsToCreate: Prisma.OrderItemCreateWithoutOrderInput[] = [];

        for (const item of body.items) {
          const dbItem = itemMap.get(item.itemId);

          if (!dbItem) {
            return reply.status(400).send({ error: "Item not available" });
          }

          const selections = parseModifiers(item.modifiers);
          const modifierLinks = new Map(
            dbItem.itemModifiers.map((link) => [link.modifierId, link])
          );

          let unitPriceCents = dbItem.priceCents;
          const orderItemOptions: Prisma.OrderItemOptionCreateWithoutOrderItemInput[] = [];

          for (const [modifierId, optionId] of Object.entries(selections)) {
            const link = modifierLinks.get(modifierId);

            if (!link) {
              return reply
                .status(400)
                .send({ error: "Modifier not allowed for item" });
            }

            const modifier = link.modifier;
            const option = modifier.modifierOptions.find((opt) => opt.id === optionId);

            if (!option) {
              return reply.status(400).send({ error: "Modifier option not found" });
            }

            unitPriceCents += option.priceDeltaCents;
            orderItemOptions.push({
              modifier: {
                connect: { id: modifier.id },
              },
              modifierOption: {
                connect: { id: option.id },
              },
              titleSnapshot: `${modifier.title}: ${option.title}`,
              priceDeltaCents: option.priceDeltaCents,
            });
          }

          const requiredModifiersMissing = dbItem.itemModifiers.some((link) => {
            const modifier = link.modifier;
            const minRequired = link.isRequired || modifier.minSelect > 0 ? 1 : modifier.minSelect;
            if (!minRequired) {
              return false;
            }
            return !selections[link.modifierId];
          });

          if (requiredModifiersMissing) {
            return reply.status(400).send({ error: "Missing required modifiers" });
          }

          orderTotalCents += unitPriceCents * item.quantity;

          orderItemsToCreate.push({
            item: {
              connect: { id: dbItem.id },
            },
            titleSnapshot: dbItem.title,
            unitPriceCents,
            quantity: item.quantity,
            orderItemOptions: {
              create: orderItemOptions,
            },
          });
        }

        const createdOrder = await db.order.create({
          data: {
            storeId: store.id,
            tableId: table.id,
            status: OrderStatus.PLACED,
            totalCents: orderTotalCents,
            note: body.note,
            orderItems: {
              create: orderItemsToCreate,
            },
          },
          include: {
            table: { select: { id: true, label: true } },
            orderItems: {
              include: {
                orderItemOptions: true,
              },
            },
          },
        });

        publishMessage(`stores/${STORE_SLUG}/printing`, {
          orderId: createdOrder.id,
          tableId: createdOrder.tableId,
          tableLabel: table.label,
          createdAt: createdOrder.createdAt,
          totalCents: createdOrder.totalCents,
          note: createdOrder.note,
          items: createdOrder.orderItems.map((orderItem) => ({
            title: orderItem.titleSnapshot,
            quantity: orderItem.quantity,
            unitPriceCents: orderItem.unitPriceCents,
            modifiers: orderItem.orderItemOptions,
          })),
        });

        return reply.status(201)
          .header('Server-Timing', 'total;desc="createOrder"')
          .send({ order: serializeOrder(createdOrder) });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply
            .status(400)
            .send({ error: "Invalid request", details: error.errors });
        }
        console.error("Create order error:", error);
        return reply.status(500).send({ error: "Failed to create order" });
      }
    }
  );

  // Get orders (protected)
  fastify.get(
    "/orders",
    {
      preHandler: [authMiddleware],
    },
    async (request, reply) => {
      try {
        const store = await ensureStore();
        const query = z
          .object({ status: z.nativeEnum(OrderStatus).optional() })
          .parse(request.query ?? {});

        const queryTake = Math.min(
          Math.max(Number((request.query as any)?.take ?? 30), 1),
          100
        );
        const ordersData = await db.order.findMany({
          where: {
            storeId: store.id,
            ...(query.status ? { status: query.status } : {}),
          },
          orderBy: { placedAt: "desc" },
          take: queryTake,
          include: {
            table: { select: { id: true, label: true } },
            orderItems: {
              include: {
                orderItemOptions: true,
              },
            },
          },
        });

        return reply.send({ orders: ordersData.map(serializeOrder) });
      } catch (error) {
        console.error("Get orders error:", error);
        return reply.status(500).send({ error: "Failed to fetch orders" });
      }
    }
  );

  fastify.get(
    "/orders/:id",
    {
      preHandler: [authMiddleware],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const store = await ensureStore();

        const order = await db.order.findFirst({
          where: { id, storeId: store.id },
          include: {
            table: { select: { id: true, label: true } },
            orderItems: {
              include: {
                orderItemOptions: true,
              },
            },
          },
        });

        if (!order) {
          return reply.status(404).send({ error: "Order not found" });
        }

        return reply.send({ order: serializeOrder(order) });
      } catch (error) {
        console.error("Get order error:", error);
        return reply.status(500).send({ error: "Failed to fetch order" });
      }
    }
  );

  // Update order status (protected)
  fastify.patch(
    "/orders/:id/status",
    {
      preHandler: [authMiddleware],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const body = updateStatusSchema.parse(request.body);
        const store = await ensureStore();
        const actorRole = (request as any).user?.role as string | undefined;

        const existing = await db.order.findFirst({
          where: { id, storeId: store.id },
        });

        if (!existing) {
          return reply.status(404).send({ error: "Order not found" });
        }

        // Role-based status transitions
        // - PREPARING, READY: cook or manager
        // - SERVED: waiter or manager
        // - CANCELLED: manager or cook
        const next = body.status;
        const allowByRole = (role?: string) => {
          if (!role) return false;
          if (next === OrderStatus.SERVED) return role === 'waiter' || role === 'manager';
          if (next === OrderStatus.PREPARING || next === OrderStatus.READY) return role === 'cook' || role === 'manager';
          if (next === OrderStatus.CANCELLED) return role === 'manager' || role === 'cook';
          return role === 'manager';
        };

        if (!allowByRole(actorRole)) {
          return reply.status(403).send({ error: 'Insufficient permissions for status change' });
        }

        const prev = existing.status;
        const updatedOrder = await db.order.update({
          where: { id },
          data: { status: body.status, updatedAt: new Date() },
          include: {
            table: true,
            orderItems: {
              include: {
                orderItemOptions: true,
              },
            },
          },
        });

        if (body.status === OrderStatus.PREPARING) {
          publishMessage(`stores/${STORE_SLUG}/tables/${updatedOrder.tableId}/accepted`, {
            orderId: updatedOrder.id,
            tableId: updatedOrder.tableId,
            status: OrderStatus.PREPARING,
            ts: new Date().toISOString(),
          });
        }

        if (body.status === OrderStatus.READY) {
          publishMessage(`stores/${STORE_SLUG}/tables/${updatedOrder.tableId}/ready`, {
            orderId: updatedOrder.id,
            tableId: updatedOrder.tableId,
            status: OrderStatus.READY,
            ts: new Date().toISOString(),
          });
        }

        if (body.status === OrderStatus.CANCELLED) {
          publishMessage(`stores/${STORE_SLUG}/tables/${updatedOrder.tableId}/cancelled`, {
            orderId: updatedOrder.id,
            tableId: updatedOrder.tableId,
            status: OrderStatus.CANCELLED,
            ts: new Date().toISOString(),
          });
        }

        return reply.send({ order: serializeOrder(updatedOrder) });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply
            .status(400)
            .send({ error: "Invalid request", details: error.errors });
        }
        console.error("Update order status error:", error);
        return reply
          .status(500)
          .send({ error: "Failed to update order status" });
      }
    }
  );

  fastify.get(
    "/orders/queue",
    {
      preHandler: [ipWhitelistMiddleware],
    },
    async (_request, reply) => {
      try {
        const store = await ensureStore();
        const ahead = await db.order.count({
          where: {
            storeId: store.id,
            status: {
              in: [OrderStatus.PLACED, OrderStatus.PREPARING],
            },
          },
        });
        return reply.send({ ahead });
      } catch (error) {
        console.error("Order queue summary error:", error);
        return reply
          .status(500)
          .send({ error: "Failed to fetch order queue summary" });
      }
    }
  );

  // Call waiter (IP whitelisted)
  fastify.post(
    "/call-waiter",
    {
      preHandler: [ipWhitelistMiddleware],
    },
    async (request, reply) => {
      try {
        const body = callWaiterSchema.parse(request.body);
        const store = await ensureStore();

        const table = await db.table.findFirst({
          where: { id: body.tableId, storeId: store.id },
        });

        if (!table) {
          return reply.status(404).send({ error: "Table not found" });
        }

        publishMessage(`stores/${STORE_SLUG}/tables/${body.tableId}/call`, {
          tableId: body.tableId,
          ts: new Date().toISOString(),
        });

        return reply.send({ success: true });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply
            .status(400)
            .send({ error: "Invalid request", details: error.errors });
        }
        console.error("Call waiter error:", error);
        return reply.status(500).send({ error: "Failed to call waiter" });
      }
    }
  );
}
