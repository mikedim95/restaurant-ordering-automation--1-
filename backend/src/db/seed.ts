import { db } from "./index.js";
import bcrypt from "bcrypt";
import dotenv from "dotenv";

dotenv.config();

async function seed() {
  console.log("Seeding database...");

  // Hash for "changeme"
  const passwordHash = await bcrypt.hash("changeme", 12);

  // Store
  await db.storeMeta.upsert({
    where: { slug: "demo-cafe" },
    update: { name: "Demo Café", currency: "EUR" },
    create: {
      slug: "demo-cafe",
      name: "Demo Café",
      currency: "EUR",
    },
  });

  // Categories
  const catCoffee = await db.category.upsert({
    where: { name: "Coffee" },
    update: { sortOrder: 1 },
    create: { name: "Coffee", sortOrder: 1 },
  });
  const catTea = await db.category.upsert({
    where: { name: "Tea" },
    update: { sortOrder: 2 },
    create: { name: "Tea", sortOrder: 2 },
  });
  const catPastries = await db.category.upsert({
    where: { name: "Pastries" },
    update: { sortOrder: 3 },
    create: { name: "Pastries", sortOrder: 3 },
  });

  // Items
  const coffeeItems = [
    {
      name: "Espresso",
      description: "Single shot",
      priceCents: 250,
      sortOrder: 1,
    },
    {
      name: "Cappuccino",
      description: "Espresso + milk foam",
      priceCents: 350,
      sortOrder: 2,
    },
    {
      name: "Latte",
      description: "Mild milk coffee",
      priceCents: 400,
      sortOrder: 3,
    },
    {
      name: "Americano",
      description: "Espresso + hot water",
      priceCents: 300,
      sortOrder: 4,
    },
  ];

  const itemsMap: Record<string, any> = {};
  for (const item of coffeeItems) {
    const inserted = await db.item.upsert({
      where: { name: item.name },
      update: { ...item, categoryId: catCoffee.id, available: true },
      create: { ...item, categoryId: catCoffee.id, available: true },
    });
    itemsMap[item.name] = inserted;
  }

  await db.item.upsert({
    where: { name: "English Breakfast" },
    update: {
      categoryId: catTea.id,
      description: "Black tea",
      priceCents: 280,
      available: true,
      sortOrder: 1,
    },
    create: {
      categoryId: catTea.id,
      name: "English Breakfast",
      description: "Black tea",
      priceCents: 280,
      available: true,
      sortOrder: 1,
    },
  });
  await db.item.upsert({
    where: { name: "Green Tea" },
    update: {
      categoryId: catTea.id,
      description: "Sencha",
      priceCents: 300,
      available: true,
      sortOrder: 2,
    },
    create: {
      categoryId: catTea.id,
      name: "Green Tea",
      description: "Sencha",
      priceCents: 300,
      available: true,
      sortOrder: 2,
    },
  });
  await db.item.upsert({
    where: { name: "Croissant" },
    update: {
      categoryId: catPastries.id,
      description: "Butter croissant",
      priceCents: 220,
      available: true,
      sortOrder: 1,
    },
    create: {
      categoryId: catPastries.id,
      name: "Croissant",
      description: "Butter croissant",
      priceCents: 220,
      available: true,
      sortOrder: 1,
    },
  });
  await db.item.upsert({
    where: { name: "Chocolate Muffin" },
    update: {
      categoryId: catPastries.id,
      description: "Rich cocoa",
      priceCents: 250,
      available: true,
      sortOrder: 2,
    },
    create: {
      categoryId: catPastries.id,
      name: "Chocolate Muffin",
      description: "Rich cocoa",
      priceCents: 250,
      available: true,
      sortOrder: 2,
    },
  });

  // Modifiers
  const milkMod = await db.modifier.upsert({
    where: { name: "Milk" },
    update: {},
    create: { name: "Milk" },
  });
  const sizeMod = await db.modifier.upsert({
    where: { name: "Size" },
    update: {},
    create: { name: "Size" },
  });
  const sugarMod = await db.modifier.upsert({
    where: { name: "Sugar" },
    update: {},
    create: { name: "Sugar" },
  });

  // Modifier options
  const modifierOptions = [
    { modifierId: milkMod.id, label: "Whole milk", priceDeltaCents: 0 },
    { modifierId: milkMod.id, label: "Skim milk", priceDeltaCents: 0 },
    { modifierId: milkMod.id, label: "Oat milk", priceDeltaCents: 30 },
    { modifierId: milkMod.id, label: "Soy milk", priceDeltaCents: 30 },
    { modifierId: sizeMod.id, label: "Small", priceDeltaCents: 0 },
    { modifierId: sizeMod.id, label: "Medium", priceDeltaCents: 50 },
    { modifierId: sizeMod.id, label: "Large", priceDeltaCents: 100 },
    { modifierId: sugarMod.id, label: "No sugar", priceDeltaCents: 0 },
    { modifierId: sugarMod.id, label: "1 tsp", priceDeltaCents: 0 },
    { modifierId: sugarMod.id, label: "2 tsp", priceDeltaCents: 0 },
  ];

  for (const option of modifierOptions) {
    await db.modifierOption.upsert({
      where: {
        modifierId_label: {
          modifierId: option.modifierId,
          label: option.label,
        },
      },
      update: { priceDeltaCents: option.priceDeltaCents },
      create: option,
    });
  }

  // Link modifiers to items
  if (itemsMap["Cappuccino"]) {
    await db.itemModifier.upsert({
      where: {
        itemId_modifierId: {
          itemId: itemsMap["Cappuccino"].id,
          modifierId: milkMod.id,
        },
      },
      update: {},
      create: { itemId: itemsMap["Cappuccino"].id, modifierId: milkMod.id },
    });
    await db.itemModifier.upsert({
      where: {
        itemId_modifierId: {
          itemId: itemsMap["Cappuccino"].id,
          modifierId: sizeMod.id,
        },
      },
      update: {},
      create: { itemId: itemsMap["Cappuccino"].id, modifierId: sizeMod.id },
    });
    await db.itemModifier.upsert({
      where: {
        itemId_modifierId: {
          itemId: itemsMap["Cappuccino"].id,
          modifierId: sugarMod.id,
        },
      },
      update: {},
      create: { itemId: itemsMap["Cappuccino"].id, modifierId: sugarMod.id },
    });
  }
  if (itemsMap["Latte"]) {
    await db.itemModifier.upsert({
      where: {
        itemId_modifierId: {
          itemId: itemsMap["Latte"].id,
          modifierId: milkMod.id,
        },
      },
      update: {},
      create: { itemId: itemsMap["Latte"].id, modifierId: milkMod.id },
    });
    await db.itemModifier.upsert({
      where: {
        itemId_modifierId: {
          itemId: itemsMap["Latte"].id,
          modifierId: sizeMod.id,
        },
      },
      update: {},
      create: { itemId: itemsMap["Latte"].id, modifierId: sizeMod.id },
    });
    await db.itemModifier.upsert({
      where: {
        itemId_modifierId: {
          itemId: itemsMap["Latte"].id,
          modifierId: sugarMod.id,
        },
      },
      update: {},
      create: { itemId: itemsMap["Latte"].id, modifierId: sugarMod.id },
    });
  }
  if (itemsMap["Americano"]) {
    await db.itemModifier.upsert({
      where: {
        itemId_modifierId: {
          itemId: itemsMap["Americano"].id,
          modifierId: sizeMod.id,
        },
      },
      update: {},
      create: { itemId: itemsMap["Americano"].id, modifierId: sizeMod.id },
    });
    await db.itemModifier.upsert({
      where: {
        itemId_modifierId: {
          itemId: itemsMap["Americano"].id,
          modifierId: sugarMod.id,
        },
      },
      update: {},
      create: { itemId: itemsMap["Americano"].id, modifierId: sugarMod.id },
    });
  }

  // Tables
  const tableLabels = ["T1", "T2", "T3", "T4", "T5", "T6"];
  const tablesMap: Record<string, any> = {};
  for (const label of tableLabels) {
    const t = await db.table.upsert({
      where: { label },
      update: { active: true },
      create: { label, active: true },
    });
    tablesMap[label] = t;
  }

  // Profiles
  const w1 = await db.profile.upsert({
    where: { email: "waiter1@demo.local" },
    update: { displayName: "Waiter 1" },
    create: {
      email: "waiter1@demo.local",
      passwordHash,
      role: "waiter",
      displayName: "Waiter 1",
    },
  });
  const w2 = await db.profile.upsert({
    where: { email: "waiter2@demo.local" },
    update: { displayName: "Waiter 2" },
    create: {
      email: "waiter2@demo.local",
      passwordHash,
      role: "waiter",
      displayName: "Waiter 2",
    },
  });
  const mgr = await db.profile.upsert({
    where: { email: "manager@demo.local" },
    update: { displayName: "Manager" },
    create: {
      email: "manager@demo.local",
      passwordHash,
      role: "manager",
      displayName: "Manager",
    },
  });

  // Waiter assignments
  const waiterAssignments = [
    { waiterId: w1.id, tableId: tablesMap["T1"].id },
    { waiterId: w1.id, tableId: tablesMap["T2"].id },
    { waiterId: w1.id, tableId: tablesMap["T3"].id },
    { waiterId: w2.id, tableId: tablesMap["T4"].id },
    { waiterId: w2.id, tableId: tablesMap["T5"].id },
    { waiterId: w2.id, tableId: tablesMap["T6"].id },
  ];

  for (const assignment of waiterAssignments) {
    await db.waiterTable.upsert({
      where: {
        waiterId_tableId: {
          waiterId: assignment.waiterId,
          tableId: assignment.tableId,
        },
      },
      update: {},
      create: assignment,
    });
  }

  console.log("Seed completed!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
