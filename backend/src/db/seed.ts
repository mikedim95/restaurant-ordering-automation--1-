import { db } from './index.js';
import { storeMeta, profiles, tables, waiterTables, categories, items, modifiers, modifierOptions, itemModifiers } from './schema.js';
import { eq, sql } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

async function seed() {
  console.log('Seeding database...');

  // Hash for "changeme"
  const passwordHash = await bcrypt.hash('changeme', 12);

  // Store
  const [store] = await db.insert(storeMeta).values({
    slug: 'demo-cafe',
    name: 'Demo Café',
    currency: 'EUR',
    defaultLanguage: 'en',
  }).onConflictDoUpdate({
    target: storeMeta.slug,
    set: { name: 'Demo Café', currency: 'EUR', defaultLanguage: 'en' }
  }).returning();

  // Categories
  const [catCoffee] = await db.insert(categories).values({ name: 'Coffee', sortOrder: 1 })
    .onConflictDoUpdate({ target: categories.name, set: { sortOrder: 1 } }).returning();
  const [catTea] = await db.insert(categories).values({ name: 'Tea', sortOrder: 2 })
    .onConflictDoUpdate({ target: categories.name, set: { sortOrder: 2 } }).returning();
  const [catPastries] = await db.insert(categories).values({ name: 'Pastries', sortOrder: 3 })
    .onConflictDoUpdate({ target: categories.name, set: { sortOrder: 3 } }).returning();

  // Items
  const coffeeItems = [
    { name: 'Espresso', description: 'Single shot', priceCents: 250, sortOrder: 1 },
    { name: 'Cappuccino', description: 'Espresso + milk foam', priceCents: 350, sortOrder: 2 },
    { name: 'Latte', description: 'Mild milk coffee', priceCents: 400, sortOrder: 3 },
    { name: 'Americano', description: 'Espresso + hot water', priceCents: 300, sortOrder: 4 },
  ];

  const itemsMap: Record<string, any> = {};
  for (const item of coffeeItems) {
    const [inserted] = await db.insert(items).values({ ...item, categoryId: catCoffee.id, available: true })
      .onConflictDoUpdate({ target: items.name, set: { ...item, categoryId: catCoffee.id, available: true } }).returning();
    itemsMap[item.name] = inserted;
  }

  await db.insert(items).values({ categoryId: catTea.id, name: 'English Breakfast', description: 'Black tea', priceCents: 280, available: true, sortOrder: 1 })
    .onConflictDoUpdate({ target: items.name, set: { categoryId: catTea.id, description: 'Black tea', priceCents: 280, available: true, sortOrder: 1 } });
  await db.insert(items).values({ categoryId: catTea.id, name: 'Green Tea', description: 'Sencha', priceCents: 300, available: true, sortOrder: 2 })
    .onConflictDoUpdate({ target: items.name, set: { categoryId: catTea.id, description: 'Sencha', priceCents: 300, available: true, sortOrder: 2 } });
  await db.insert(items).values({ categoryId: catPastries.id, name: 'Croissant', description: 'Butter croissant', priceCents: 220, available: true, sortOrder: 1 })
    .onConflictDoUpdate({ target: items.name, set: { categoryId: catPastries.id, description: 'Butter croissant', priceCents: 220, available: true, sortOrder: 1 } });
  await db.insert(items).values({ categoryId: catPastries.id, name: 'Chocolate Muffin', description: 'Rich cocoa', priceCents: 250, available: true, sortOrder: 2 })
    .onConflictDoUpdate({ target: items.name, set: { categoryId: catPastries.id, description: 'Rich cocoa', priceCents: 250, available: true, sortOrder: 2 } });

  // Modifiers
  const [modMilk] = await db.insert(modifiers).values({ name: 'Milk' }).onConflictDoNothing({ target: modifiers.name }).returning();
  const [modSize] = await db.insert(modifiers).values({ name: 'Size' }).onConflictDoNothing({ target: modifiers.name }).returning();
  const [modSugar] = await db.insert(modifiers).values({ name: 'Sugar' }).onConflictDoNothing({ target: modifiers.name }).returning();

  const milkMod = modMilk || (await db.select().from(modifiers).where(eq(modifiers.name, 'Milk')).limit(1))[0];
  const sizeMod = modSize || (await db.select().from(modifiers).where(eq(modifiers.name, 'Size')).limit(1))[0];
  const sugarMod = modSugar || (await db.select().from(modifiers).where(eq(modifiers.name, 'Sugar')).limit(1))[0];

  // Modifier options
  await db.insert(modifierOptions).values([
    { modifierId: milkMod.id, label: 'Whole milk', priceDeltaCents: 0 },
    { modifierId: milkMod.id, label: 'Skim milk', priceDeltaCents: 0 },
    { modifierId: milkMod.id, label: 'Oat milk', priceDeltaCents: 30 },
    { modifierId: milkMod.id, label: 'Soy milk', priceDeltaCents: 30 },
    { modifierId: sizeMod.id, label: 'Small', priceDeltaCents: 0 },
    { modifierId: sizeMod.id, label: 'Medium', priceDeltaCents: 50 },
    { modifierId: sizeMod.id, label: 'Large', priceDeltaCents: 100 },
    { modifierId: sugarMod.id, label: 'No sugar', priceDeltaCents: 0 },
    { modifierId: sugarMod.id, label: '1 tsp', priceDeltaCents: 0 },
    { modifierId: sugarMod.id, label: '2 tsp', priceDeltaCents: 0 },
  ]).onConflictDoNothing();

  // Link modifiers to items
  if (itemsMap['Cappuccino']) {
    await db.insert(itemModifiers).values([
      { itemId: itemsMap['Cappuccino'].id, modifierId: milkMod.id },
      { itemId: itemsMap['Cappuccino'].id, modifierId: sizeMod.id },
      { itemId: itemsMap['Cappuccino'].id, modifierId: sugarMod.id },
    ]).onConflictDoNothing();
  }
  if (itemsMap['Latte']) {
    await db.insert(itemModifiers).values([
      { itemId: itemsMap['Latte'].id, modifierId: milkMod.id },
      { itemId: itemsMap['Latte'].id, modifierId: sizeMod.id },
      { itemId: itemsMap['Latte'].id, modifierId: sugarMod.id },
    ]).onConflictDoNothing();
  }
  if (itemsMap['Americano']) {
    await db.insert(itemModifiers).values([
      { itemId: itemsMap['Americano'].id, modifierId: sizeMod.id },
      { itemId: itemsMap['Americano'].id, modifierId: sugarMod.id },
    ]).onConflictDoNothing();
  }

  // Tables
  const tableLabels = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6'];
  const tablesMap: Record<string, any> = {};
  for (const label of tableLabels) {
    const [t] = await db.insert(tables).values({ label, active: true })
      .onConflictDoUpdate({ target: tables.label, set: { active: true } }).returning();
    tablesMap[label] = t;
  }

  // Profiles
  const [w1] = await db.insert(profiles).values({ email: 'waiter1@demo.local', passwordHash, role: 'waiter', displayName: 'Waiter 1' })
    .onConflictDoUpdate({ target: profiles.email, set: { displayName: 'Waiter 1' } }).returning();
  const [w2] = await db.insert(profiles).values({ email: 'waiter2@demo.local', passwordHash, role: 'waiter', displayName: 'Waiter 2' })
    .onConflictDoUpdate({ target: profiles.email, set: { displayName: 'Waiter 2' } }).returning();
  const [mgr] = await db.insert(profiles).values({ email: 'manager@demo.local', passwordHash, role: 'manager', displayName: 'Manager' })
    .onConflictDoUpdate({ target: profiles.email, set: { displayName: 'Manager' } }).returning();

  // Waiter assignments
  await db.insert(waiterTables).values([
    { waiterId: w1.id, tableId: tablesMap['T1'].id },
    { waiterId: w1.id, tableId: tablesMap['T2'].id },
    { waiterId: w1.id, tableId: tablesMap['T3'].id },
    { waiterId: w2.id, tableId: tablesMap['T4'].id },
    { waiterId: w2.id, tableId: tablesMap['T5'].id },
    { waiterId: w2.id, tableId: tablesMap['T6'].id },
  ]).onConflictDoNothing();

  console.log('Seed completed!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
