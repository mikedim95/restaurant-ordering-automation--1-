import { db } from '../db/index.js';

export const STORE_SLUG = process.env.STORE_SLUG || 'demo-cafe';

let cachedStore: { id: string; slug: string; name: string } | null = null;
let lastFetch = 0;
const STORE_CACHE_TTL_MS = 60_000; // 60s

export async function ensureStore() {
  const now = Date.now();
  if (cachedStore && now - lastFetch < STORE_CACHE_TTL_MS) {
    return cachedStore;
  }

  const store = await db.store.findUnique({
    where: { slug: STORE_SLUG },
    select: { id: true, slug: true, name: true },
  });

  if (!store) {
    throw new Error(`Store with slug "${STORE_SLUG}" not found. Seed the database first or set STORE_SLUG.`);
  }

  cachedStore = store;
  lastFetch = now;
  return store;
}
