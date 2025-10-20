// prisma/seed.ts
import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  // ---------- Store ----------
  const store = await prisma.store.upsert({
    where: { slug: "demo-cafe" }, // slug is globally unique
    update: {},
    create: {
      slug: "demo-cafe",
      name: "OrderFlow Demo Café",
      settingsJson: { theme: "light", taxRate: 0.24 },
    },
  });

  // ---------- StoreMeta ----------
  await prisma.storeMeta.upsert({
    where: { storeId: store.id }, // unique
    update: { currencyCode: "EUR", locale: "en" },
    create: {
      storeId: store.id,
      currencyCode: "EUR",
      locale: "en",
    },
  });

  // ---------- Tables T1..T4 ----------
  const tableLabels = ["T1", "T2", "T3", "T4"];
  for (const label of tableLabels) {
    await prisma.table.upsert({
      where: { storeId_label: { storeId: store.id, label } }, // @@unique([storeId, label])
      update: { isActive: true },
      create: { storeId: store.id, label, isActive: true },
    });
  }

  // ---------- Categories ----------
  const cats = [
    { slug: "coffee", title: "Coffee", sortOrder: 10 },
    { slug: "snacks", title: "Snacks", sortOrder: 20 },
  ];
  const categories = [];
  for (const c of cats) {
    const cat = await prisma.category.upsert({
      where: { storeId_slug: { storeId: store.id, slug: c.slug } }, // @@unique([storeId, slug])
      update: { title: c.title, sortOrder: c.sortOrder },
      create: {
        storeId: store.id,
        slug: c.slug,
        title: c.title,
        sortOrder: c.sortOrder,
      },
    });
    categories.push(cat);
  }
  const catCoffee = categories.find((c) => c.slug === "coffee")!;
  const catSnacks = categories.find((c) => c.slug === "snacks")!;

  // ---------- Items ----------
  const itemsSpec = [
    // Coffee
    {
      slug: "espresso",
      title: "Espresso",
      desc: "Single shot",
      price: 200,
      catId: catCoffee.id,
      sort: 10,
    },
    {
      slug: "cappuccino",
      title: "Cappuccino",
      desc: "Foamed milk",
      price: 350,
      catId: catCoffee.id,
      sort: 20,
    },
    {
      slug: "latte",
      title: "Latte",
      desc: "Milk-forward",
      price: 380,
      catId: catCoffee.id,
      sort: 30,
    },
    // Snacks
    {
      slug: "croissant",
      title: "Butter Croissant",
      desc: "Flaky & fresh",
      price: 320,
      catId: catSnacks.id,
      sort: 10,
    },
    {
      slug: "muffin-choc",
      title: "Chocolate Muffin",
      desc: "Rich cocoa",
      price: 300,
      catId: catSnacks.id,
      sort: 20,
    },
    {
      slug: "toast-ham",
      title: "Ham & Cheese Toast",
      desc: "Grilled",
      price: 450,
      catId: catSnacks.id,
      sort: 30,
    },
  ];

  const items = [];
  for (const it of itemsSpec) {
    const item = await prisma.item.upsert({
      where: { storeId_slug: { storeId: store.id, slug: it.slug } }, // @@unique([storeId, slug])
      update: {
        title: it.title,
        description: it.desc,
        priceCents: it.price,
        isAvailable: true,
        sortOrder: it.sort,
      },
      create: {
        storeId: store.id,
        categoryId: it.catId,
        slug: it.slug,
        title: it.title,
        description: it.desc,
        priceCents: it.price,
        isAvailable: true,
        sortOrder: it.sort,
      },
    });
    items.push(item);
  }
  const itemBySlug = Object.fromEntries(items.map((i) => [i.slug, i]));

  // ---------- Modifiers ----------
  // Milk choice (0..1), Size (1..1), Extra Shot (0..1)
  const modifiersSpec = [
    { slug: "milk", title: "Milk", min: 0, max: 1, sort: 10 },
    { slug: "size", title: "Size", min: 1, max: 1, sort: 20 },
    { slug: "extra-shot", title: "Extra Shot", min: 0, max: 1, sort: 30 },
  ];
  const modifiers = [];
  for (const m of modifiersSpec) {
    const mod = await prisma.modifier.upsert({
      where: { storeId_slug: { storeId: store.id, slug: m.slug } }, // @@unique([storeId, slug])
      update: { title: m.title, minSelect: m.min, maxSelect: m.max },
      create: {
        storeId: store.id,
        slug: m.slug,
        title: m.title,
        minSelect: m.min,
        maxSelect: m.max,
      },
    });
    modifiers.push(mod);
  }
  const modBySlug = Object.fromEntries(modifiers.map((m) => [m.slug, m]));

  // ---------- Modifier Options ----------
  const modOptionsSpec: Array<{
    modSlug: string;
    slug: string;
    title: string;
    delta: number;
    sort: number;
  }> = [
    // milk
    { modSlug: "milk", slug: "whole", title: "Whole Milk", delta: 0, sort: 10 },
    { modSlug: "milk", slug: "skim", title: "Skim Milk", delta: 0, sort: 20 },
    { modSlug: "milk", slug: "oat", title: "Oat Milk", delta: 50, sort: 30 },
    // size
    { modSlug: "size", slug: "small", title: "Small", delta: 0, sort: 10 },
    { modSlug: "size", slug: "medium", title: "Medium", delta: 50, sort: 20 },
    { modSlug: "size", slug: "large", title: "Large", delta: 100, sort: 30 },
    // extra shot
    {
      modSlug: "extra-shot",
      slug: "yes",
      title: "Add 1 Shot",
      delta: 100,
      sort: 10,
    },
  ];

  const modOptionByKey: Record<string, any> = {};
  for (const o of modOptionsSpec) {
    const modifier = modBySlug[o.modSlug];
    const opt = await prisma.modifierOption.upsert({
      where: { modifierId_slug: { modifierId: modifier.id, slug: o.slug } }, // @@unique([modifierId, slug])
      update: { title: o.title, priceDeltaCents: o.delta, sortOrder: o.sort },
      create: {
        storeId: store.id,
        modifierId: modifier.id,
        slug: o.slug,
        title: o.title,
        priceDeltaCents: o.delta,
        sortOrder: o.sort,
      },
    });
    modOptionByKey[`${o.modSlug}:${o.slug}`] = opt;
  }

  // ---------- Link Items ↔ Modifiers ----------
  const coffeeItems = ["espresso", "cappuccino", "latte"];
  for (const slug of coffeeItems) {
    const item = itemBySlug[slug];
    for (const mSlug of ["size", "milk", "extra-shot"]) {
      await prisma.itemModifier.upsert({
        where: {
          itemId_modifierId: {
            itemId: item.id,
            modifierId: modBySlug[mSlug].id,
          },
        }, // @@unique([itemId, modifierId])
        update: {},
        create: {
          storeId: store.id,
          itemId: item.id,
          modifierId: modBySlug[mSlug].id,
          isRequired: mSlug === "size", // size is required
        },
      });
    }
  }

  // Example non-coffee items might only get size
  for (const slug of ["croissant", "muffin-choc", "toast-ham"]) {
    const item = itemBySlug[slug];
    await prisma.itemModifier.upsert({
      where: {
        itemId_modifierId: {
          itemId: item.id,
          modifierId: modBySlug["size"].id,
        },
      },
      update: {},
      create: {
        storeId: store.id,
        itemId: item.id,
        modifierId: modBySlug["size"].id,
        isRequired: false,
      },
    });
  }

  // ---------- Staff profiles ----------
  const defaultPassword = process.env.DEFAULT_USER_PASSWORD || "changeme";
  const passwordHash = await bcrypt.hash(defaultPassword, 10);

  const managerEmail = (process.env.MANAGER_EMAIL || "manager@demo.local").toLowerCase();
  const managerDisplayName = process.env.MANAGER_DISPLAY_NAME || "Demo Manager";
  const managerId = process.env.MANAGER_USER_ID;

  if (managerId) {
    await prisma.profile.upsert({
      where: { id: managerId },
      update: {
        storeId: store.id,
        role: Role.MANAGER,
        displayName: managerDisplayName,
        email: managerEmail,
        passwordHash,
      },
      create: {
        id: managerId,
        storeId: store.id,
        role: Role.MANAGER,
        displayName: managerDisplayName,
        email: managerEmail,
        passwordHash,
      },
    });
  } else {
    await prisma.profile.upsert({
      where: { email: managerEmail },
      update: {
        storeId: store.id,
        role: Role.MANAGER,
        displayName: managerDisplayName,
        passwordHash,
      },
      create: {
        storeId: store.id,
        role: Role.MANAGER,
        displayName: managerDisplayName,
        email: managerEmail,
        passwordHash,
      },
    });
  }

  const waiterEmail = (process.env.WAITER_EMAIL || "waiter1@demo.local").toLowerCase();
  const waiterDisplayName = process.env.WAITER_DISPLAY_NAME || "Waiter 1";

  const waiter = await prisma.profile.upsert({
    where: { email: waiterEmail },
    update: {
      storeId: store.id,
      role: Role.WAITER,
      displayName: waiterDisplayName,
      passwordHash,
    },
    create: {
      storeId: store.id,
      role: Role.WAITER,
      displayName: waiterDisplayName,
      email: waiterEmail,
      passwordHash,
    },
  });

  const tablesForAssignments = await prisma.table.findMany({
    where: { storeId: store.id },
    orderBy: { label: "asc" },
  });

  for (const table of tablesForAssignments.slice(0, 2)) {
    await prisma.waiterTable.upsert({
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
    });
  }

  console.log("✅ Seed complete for store:", store.slug);
  console.log("   Manager login:", managerEmail);
  console.log("   Waiter login:", waiterEmail);
  console.log(
    "   Waiter tables:",
    tablesForAssignments
      .slice(0, 2)
      .map((t) => t.label)
      .join(", ") || "(none)"
  );
  console.log("   Default password:", defaultPassword);
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
