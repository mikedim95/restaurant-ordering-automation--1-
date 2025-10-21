import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { db } from '../db/index.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { ensureStore } from '../lib/store.js';

export async function managerRoutes(fastify: FastifyInstance) {
  const managerOnly = [authMiddleware, requireRole(['manager'])];

  // Waiters CRUD
  fastify.get('/manager/waiters', { preHandler: managerOnly }, async (_req, reply) => {
    const store = await ensureStore();
    const waiters = await db.profile.findMany({ where: { storeId: store.id, role: 'WAITER' }, orderBy: { displayName: 'asc' } });
    return reply.send({ waiters: waiters.map(w => ({ id: w.id, email: w.email, displayName: w.displayName })) });
  });

  const waiterCreateSchema = z.object({ email: z.string().email(), password: z.string().min(6), displayName: z.string().min(1) });
  fastify.post('/manager/waiters', { preHandler: managerOnly }, async (request, reply) => {
    try {
      const body = waiterCreateSchema.parse(request.body);
      const store = await ensureStore();
      const passwordHash = await bcrypt.hash(body.password, 10);
      const waiter = await db.profile.create({ data: { storeId: store.id, email: body.email.toLowerCase(), passwordHash, role: 'WAITER', displayName: body.displayName } });
      return reply.status(201).send({ waiter: { id: waiter.id, email: waiter.email, displayName: waiter.displayName } });
    } catch (e) {
      if (e instanceof z.ZodError) return reply.status(400).send({ error: 'Invalid request', details: e.errors });
      return reply.status(500).send({ error: 'Failed to create waiter' });
    }
  });

  const waiterUpdateSchema = z.object({ email: z.string().email().optional(), password: z.string().min(6).optional(), displayName: z.string().min(1).optional() });
  fastify.patch('/manager/waiters/:id', { preHandler: managerOnly }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const body = waiterUpdateSchema.parse(request.body);
      const data: any = {};
      if (body.email) data.email = body.email.toLowerCase();
      if (body.displayName) data.displayName = body.displayName;
      if (body.password) data.passwordHash = await bcrypt.hash(body.password, 10);
      const updated = await db.profile.update({ where: { id }, data });
      return reply.send({ waiter: { id: updated.id, email: updated.email, displayName: updated.displayName } });
    } catch (e) {
      if (e instanceof z.ZodError) return reply.status(400).send({ error: 'Invalid request', details: e.errors });
      return reply.status(500).send({ error: 'Failed to update waiter' });
    }
  });

  fastify.delete('/manager/waiters/:id', { preHandler: managerOnly }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      await db.profile.delete({ where: { id } });
      return reply.send({ success: true });
    } catch {
      return reply.status(500).send({ error: 'Failed to delete waiter' });
    }
  });

  // Items CRUD
  fastify.get('/manager/items', { preHandler: managerOnly }, async (_req, reply) => {
    const store = await ensureStore();
    const items = await db.item.findMany({ where: { storeId: store.id }, orderBy: { sortOrder: 'asc' }, include: { category: true } });
    return reply.send({ items: items.map(i => ({ id: i.id, title: i.title, description: i.description, priceCents: i.priceCents, isAvailable: i.isAvailable, categoryId: i.categoryId, category: i.category?.title })) });
  });

  const itemCreateSchema = z.object({ title: z.string().min(1), description: z.string().optional(), priceCents: z.number().int().nonnegative(), categoryId: z.string().uuid(), isAvailable: z.boolean().optional() });
  fastify.post('/manager/items', { preHandler: managerOnly }, async (request, reply) => {
    try {
      const body = itemCreateSchema.parse(request.body);
      const store = await ensureStore();
      const item = await db.item.create({ data: { storeId: store.id, categoryId: body.categoryId, slug: (body.title.toLowerCase().replace(/\s+/g, '-').slice(0, 60) + '-' + Math.random().toString(16).slice(2, 6)), title: body.title, description: body.description, priceCents: body.priceCents, isAvailable: body.isAvailable ?? true } });
      return reply.status(201).send({ item });
    } catch (e) {
      if (e instanceof z.ZodError) return reply.status(400).send({ error: 'Invalid request', details: e.errors });
      return reply.status(500).send({ error: 'Failed to create item' });
    }
  });

  const itemUpdateSchema = z.object({ title: z.string().min(1).optional(), description: z.string().optional(), priceCents: z.number().int().nonnegative().optional(), categoryId: z.string().uuid().optional(), isAvailable: z.boolean().optional() });
  fastify.patch('/manager/items/:id', { preHandler: managerOnly }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const body = itemUpdateSchema.parse(request.body);
      const updated = await db.item.update({ where: { id }, data: body });
      return reply.send({ item: updated });
    } catch (e) {
      if (e instanceof z.ZodError) return reply.status(400).send({ error: 'Invalid request', details: e.errors });
      return reply.status(500).send({ error: 'Failed to update item' });
    }
  });

  fastify.delete('/manager/items/:id', { preHandler: managerOnly }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      await db.item.delete({ where: { id } });
      return reply.send({ success: true });
    } catch {
      return reply.status(500).send({ error: 'Failed to delete item' });
    }
  });

  // Modifiers CRUD
  fastify.get('/manager/modifiers', { preHandler: managerOnly }, async (_req, reply) => {
    const store = await ensureStore();
    const modifiers = await db.modifier.findMany({ where: { storeId: store.id }, orderBy: { title: 'asc' }, include: { modifierOptions: { orderBy: { sortOrder: 'asc' } } } });
    return reply.send({ modifiers });
  });

  const modifierCreateSchema = z.object({ title: z.string().min(1), minSelect: z.number().int().min(0).default(0), maxSelect: z.number().int().nullable().optional() });
  fastify.post('/manager/modifiers', { preHandler: managerOnly }, async (request, reply) => {
    try {
      const body = modifierCreateSchema.parse(request.body);
      const store = await ensureStore();
      const modifier = await db.modifier.create({ data: { storeId: store.id, slug: (body.title.toLowerCase().replace(/\s+/g, '-').slice(0, 60) + '-' + Math.random().toString(16).slice(2, 6)), title: body.title, minSelect: body.minSelect, maxSelect: body.maxSelect ?? null } });
      return reply.status(201).send({ modifier });
    } catch (e) {
      if (e instanceof z.ZodError) return reply.status(400).send({ error: 'Invalid request', details: e.errors });
      return reply.status(500).send({ error: 'Failed to create modifier' });
    }
  });

  const modifierUpdateSchema = z.object({ title: z.string().min(1).optional(), minSelect: z.number().int().min(0).optional(), maxSelect: z.number().int().nullable().optional() });
  fastify.patch('/manager/modifiers/:id', { preHandler: managerOnly }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const body = modifierUpdateSchema.parse(request.body);
      const updated = await db.modifier.update({ where: { id }, data: body });
      return reply.send({ modifier: updated });
    } catch (e) {
      if (e instanceof z.ZodError) return reply.status(400).send({ error: 'Invalid request', details: e.errors });
      return reply.status(500).send({ error: 'Failed to update modifier' });
    }
  });

  fastify.delete('/manager/modifiers/:id', { preHandler: managerOnly }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      await db.modifier.delete({ where: { id } });
      return reply.send({ success: true });
    } catch {
      return reply.status(500).send({ error: 'Failed to delete modifier' });
    }
  });

  // Modifier Option create/update/delete
  const optionCreateSchema = z.object({ modifierId: z.string().uuid(), title: z.string().min(1), priceDeltaCents: z.number().int().default(0), sortOrder: z.number().int().default(0) });
  fastify.post('/manager/modifier-options', { preHandler: managerOnly }, async (request, reply) => {
    try {
      const body = optionCreateSchema.parse(request.body);
      const store = await ensureStore();
      const opt = await db.modifierOption.create({ data: { storeId: store.id, modifierId: body.modifierId, slug: (body.title.toLowerCase().replace(/\s+/g, '-').slice(0, 60) + '-' + Math.random().toString(16).slice(2, 6)), title: body.title, priceDeltaCents: body.priceDeltaCents, sortOrder: body.sortOrder } });
      return reply.status(201).send({ option: opt });
    } catch (e) {
      if (e instanceof z.ZodError) return reply.status(400).send({ error: 'Invalid request', details: e.errors });
      return reply.status(500).send({ error: 'Failed to create modifier option' });
    }
  });

  const optionUpdateSchema = z.object({ title: z.string().min(1).optional(), priceDeltaCents: z.number().int().optional(), sortOrder: z.number().int().optional() });
  fastify.patch('/manager/modifier-options/:id', { preHandler: managerOnly }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const body = optionUpdateSchema.parse(request.body);
      const updated = await db.modifierOption.update({ where: { id }, data: body });
      return reply.send({ option: updated });
    } catch (e) {
      if (e instanceof z.ZodError) return reply.status(400).send({ error: 'Invalid request', details: e.errors });
      return reply.status(500).send({ error: 'Failed to update modifier option' });
    }
  });

  fastify.delete('/manager/modifier-options/:id', { preHandler: managerOnly }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      await db.modifierOption.delete({ where: { id } });
      return reply.send({ success: true });
    } catch {
      return reply.status(500).send({ error: 'Failed to delete modifier option' });
    }
  });

  // Item-Modifier linking
  const linkSchema = z.object({ itemId: z.string().uuid(), modifierId: z.string().uuid(), isRequired: z.boolean().default(false) });
  fastify.post('/manager/item-modifiers', { preHandler: managerOnly }, async (request, reply) => {
    try {
      const body = linkSchema.parse(request.body);
      const store = await ensureStore();
      const link = await db.itemModifier.upsert({
        where: { itemId_modifierId: { itemId: body.itemId, modifierId: body.modifierId } },
        update: { isRequired: body.isRequired },
        create: { storeId: store.id, itemId: body.itemId, modifierId: body.modifierId, isRequired: body.isRequired },
      });
      return reply.status(201).send({ link });
    } catch (e) {
      if (e instanceof z.ZodError) return reply.status(400).send({ error: 'Invalid request', details: e.errors });
      return reply.status(500).send({ error: 'Failed to link modifier' });
    }
  });

  fastify.delete('/manager/item-modifiers', { preHandler: managerOnly }, async (request, reply) => {
    try {
      const body = linkSchema.parse(request.body);
      await db.itemModifier.delete({ where: { itemId_modifierId: { itemId: body.itemId, modifierId: body.modifierId } } });
      return reply.send({ success: true });
    } catch (e) {
      if (e instanceof z.ZodError) return reply.status(400).send({ error: 'Invalid request', details: e.errors });
      return reply.status(500).send({ error: 'Failed to unlink modifier' });
    }
  });

  // Orders admin (delete or cancel)
  fastify.delete('/manager/orders/:id', { preHandler: managerOnly }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      await db.order.delete({ where: { id } });
      return reply.send({ success: true });
    } catch (e) {
      return reply.status(500).send({ error: 'Failed to delete order' });
    }
  });

  fastify.patch('/manager/orders/:id/cancel', { preHandler: managerOnly }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const updated = await db.order.update({ where: { id }, data: { status: 'CANCELLED' } });
      return reply.send({ order: { id: updated.id, status: updated.status } });
    } catch (e) {
      return reply.status(500).send({ error: 'Failed to cancel order' });
    }
  });
}
