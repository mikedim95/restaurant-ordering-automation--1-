import { FastifyInstance } from "fastify";
import { Prisma, Role } from "@prisma/client";
import { z } from "zod";
import { db } from "../db/index.js";
import { ensureStore } from "../lib/store.js";
import { authMiddleware, requireRole } from "../middleware/auth.js";

const assignmentSchema = z.object({
  waiterId: z.string().uuid(),
  tableId: z.string().uuid(),
});

type WaiterTableWithRelations = Prisma.WaiterTableGetPayload<{
  include: { waiter: true; table: true };
}>;

function serializeAssignment(assignment: WaiterTableWithRelations) {
  return {
    waiterId: assignment.waiterId,
    tableId: assignment.tableId,
    waiter: {
      id: assignment.waiter.id,
      email: assignment.waiter.email,
      displayName: assignment.waiter.displayName ?? assignment.waiter.email,
    },
    table: {
      id: assignment.table.id,
      label: assignment.table.label,
      active: assignment.table.isActive,
    },
  };
}

export async function waiterTableRoutes(fastify: FastifyInstance) {
  const managerOnly = [authMiddleware, requireRole(["manager"])];

  fastify.get(
    "/waiter-tables",
    {
      preHandler: managerOnly,
    },
    async (_request, reply) => {
      try {
        const store = await ensureStore();

        const [assignments, waiters, tables] = await Promise.all([
          db.waiterTable.findMany({
            where: { storeId: store.id },
            include: { 
              waiter: true, 
              table: { select: { id: true, label: true, isActive: true } },
            },
            orderBy: { createdAt: "asc" },
          }),
          db.profile.findMany({
            where: { storeId: store.id, role: Role.WAITER },
            orderBy: { displayName: "asc" },
          }),
          db.table.findMany({
            where: { storeId: store.id },
            orderBy: { label: "asc" },
          }),
        ]);

        return reply.send({
          assignments: assignments.map(serializeAssignment),
          waiters: waiters.map((waiter) => ({
            id: waiter.id,
            email: waiter.email,
            displayName: waiter.displayName ?? waiter.email,
          })),
          tables: tables.map((table) => ({
            id: table.id,
            label: table.label,
            active: table.isActive,
          })),
        });
      } catch (error) {
        console.error("List waiter assignments error:", error);
        return reply
          .status(500)
          .send({ error: "Failed to fetch waiter assignments" });
      }
    }
  );

  fastify.post(
    "/waiter-tables",
    {
      preHandler: managerOnly,
    },
    async (request, reply) => {
      try {
        const body = assignmentSchema.parse(request.body);
        const store = await ensureStore();

        const [waiter, table] = await Promise.all([
          db.profile.findFirst({
            where: { id: body.waiterId, storeId: store.id, role: Role.WAITER },
          }),
          db.table.findFirst({
            where: { id: body.tableId, storeId: store.id },
          }),
        ]);

        if (!waiter) {
          return reply.status(404).send({ error: "Waiter not found" });
        }

        if (!table) {
          return reply.status(404).send({ error: "Table not found" });
        }

        const assignment = await db.waiterTable.upsert({
          where: {
            storeId_waiterId_tableId: {
              storeId: store.id,
              waiterId: waiter.id,
              tableId: table.id,
            },
          },
          update: {},
          create: {
            storeId: store.id,
            waiterId: waiter.id,
            tableId: table.id,
          },
          include: { 
            waiter: true, 
            table: { select: { id: true, label: true, isActive: true } },
          },
        });

        return reply.status(201).send({
          assignment: serializeAssignment(assignment),
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply
            .status(400)
            .send({ error: "Invalid request", details: error.errors });
        }

        console.error("Create waiter assignment error:", error);
        return reply
          .status(500)
          .send({ error: "Failed to assign waiter to table" });
      }
    }
  );

  fastify.delete(
    "/waiter-tables",
    {
      preHandler: managerOnly,
    },
    async (request, reply) => {
      try {
        const body = assignmentSchema.parse(request.body);
        const store = await ensureStore();

        await db.waiterTable.delete({
          where: {
            storeId_waiterId_tableId: {
              storeId: store.id,
              waiterId: body.waiterId,
              tableId: body.tableId,
            },
          },
        });

        return reply.send({ success: true });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply
            .status(400)
            .send({ error: "Invalid request", details: error.errors });
        }

        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2025"
        ) {
          return reply.status(404).send({ error: "Assignment not found" });
        }

        console.error("Delete waiter assignment error:", error);
        return reply
          .status(500)
          .send({ error: "Failed to remove waiter assignment" });
      }
    }
  );
}
