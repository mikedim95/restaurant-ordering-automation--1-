import { FastifyInstance } from 'fastify';
import { db } from '../db/index.js';
import { categories, items, modifiers, modifierOptions, itemModifiers } from '../db/schema.js';
import { eq } from 'drizzle-orm';

export async function menuRoutes(fastify: FastifyInstance) {
  fastify.get('/menu', async (request, reply) => {
    try {
      // Fetch all menu data
      const [categoriesData, itemsData, modifiersData, modifierOptionsData, itemModifiersData] = await Promise.all([
        db.select().from(categories).orderBy(categories.sortOrder),
        db.select().from(items).where(eq(items.available, true)).orderBy(items.sortOrder),
        db.select().from(modifiers),
        db.select().from(modifierOptions),
        db.select().from(itemModifiers),
      ]);

      return reply.send({
        categories: categoriesData,
        items: itemsData,
        modifiers: modifiersData,
        modifierOptions: modifierOptionsData,
        itemModifiers: itemModifiersData,
      });
    } catch (error) {
      console.error('Menu fetch error:', error);
      return reply.status(500).send({ error: 'Failed to fetch menu' });
    }
  });
}
