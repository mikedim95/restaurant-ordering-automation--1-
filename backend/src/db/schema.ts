import { pgTable, uuid, text, varchar, integer, boolean, timestamp, pgEnum, primaryKey } from 'drizzle-orm/pg-core';

export const roleEnum = pgEnum('role', ['waiter', 'manager']);
export const orderStatusEnum = pgEnum('order_status', ['PLACED', 'PREPARING', 'READY', 'SERVED', 'CANCELLED']);

export const storeMeta = pgTable('store_meta', {
  id: uuid('id').defaultRandom().primaryKey(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull().default('EUR'),
  defaultLanguage: varchar('default_language', { length: 5 }).notNull().default('en'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const profiles = pgTable('profiles', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: roleEnum('role').notNull(),
  displayName: varchar('display_name', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const tables = pgTable('tables', {
  id: uuid('id').defaultRandom().primaryKey(),
  label: varchar('label', { length: 50 }).notNull().unique(),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const waiterTables = pgTable('waiter_tables', {
  waiterId: uuid('waiter_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  tableId: uuid('table_id').notNull().references(() => tables.id, { onDelete: 'cascade' }),
}, (table) => ({
  pk: primaryKey({ columns: [table.waiterId, table.tableId] }),
}));

export const categories = pgTable('categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull().unique(),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const items = pgTable('items', {
  id: uuid('id').defaultRandom().primaryKey(),
  categoryId: uuid('category_id').notNull().references(() => categories.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull().unique(),
  description: text('description'),
  priceCents: integer('price_cents').notNull(),
  imageUrl: text('image_url'),
  available: boolean('available').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const modifiers = pgTable('modifiers', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull().unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const modifierOptions = pgTable('modifier_options', {
  id: uuid('id').defaultRandom().primaryKey(),
  modifierId: uuid('modifier_id').notNull().references(() => modifiers.id, { onDelete: 'cascade' }),
  label: varchar('label', { length: 255 }).notNull(),
  priceDeltaCents: integer('price_delta_cents').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const itemModifiers = pgTable('item_modifiers', {
  itemId: uuid('item_id').notNull().references(() => items.id, { onDelete: 'cascade' }),
  modifierId: uuid('modifier_id').notNull().references(() => modifiers.id, { onDelete: 'cascade' }),
}, (table) => ({
  pk: primaryKey({ columns: [table.itemId, table.modifierId] }),
}));

export const orders = pgTable('orders', {
  id: uuid('id').defaultRandom().primaryKey(),
  tableId: uuid('table_id').notNull().references(() => tables.id),
  status: orderStatusEnum('status').notNull().default('PLACED'),
  totalCents: integer('total_cents').notNull(),
  note: text('note'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const orderItems = pgTable('order_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  itemId: uuid('item_id').notNull().references(() => items.id),
  quantity: integer('quantity').notNull(),
  priceCents: integer('price_cents').notNull(),
  modifiers: text('modifiers'),
});
