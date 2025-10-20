import { db } from '../db/index.js';

export const STORE_SLUG = process.env.STORE_SLUG || 'demo-cafe';

export async function ensureStore() {
  const store = await db.store.findUnique({
    where: { slug: STORE_SLUG },
  });

  if (!store) {
    throw new Error(`Store with slug "${STORE_SLUG}" not found. Seed the database first or set STORE_SLUG.`);
  }

  return store;
}
