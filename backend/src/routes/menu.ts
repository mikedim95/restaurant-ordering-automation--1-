import { FastifyInstance } from "fastify";
import { db } from "../db/index.js";

export async function menuRoutes(fastify: FastifyInstance) {
  fastify.get("/menu", async (request, reply) => {
    try {
      // Fetch all menu data
      const [
        categoriesData,
        itemsData,
        modifiersData,
        modifierOptionsData,
        itemModifiersData,
      ] = await Promise.all([
        db.category.findMany({ orderBy: { sortOrder: "asc" } }),
        db.item.findMany({
          where: { available: true },
          orderBy: { sortOrder: "asc" },
        }),
        db.modifier.findMany(),
        db.modifierOption.findMany(),
        db.itemModifier.findMany(),
      ]);

      return reply.send({
        categories: categoriesData,
        items: itemsData,
        modifiers: modifiersData,
        modifierOptions: modifierOptionsData,
        itemModifiers: itemModifiersData,
      });
    } catch (error) {
      console.error("Menu fetch error:", error);
      return reply.status(500).send({ error: "Failed to fetch menu" });
    }
  });
}
