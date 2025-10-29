// Lightweight in-browser mock backend for offline testing.
// Persists to localStorage under key "devMocks" so state survives reloads.

type Id = string;

type Category = { id: Id; title: string; sortOrder: number };
type Item = { id: Id; title: string; description?: string; priceCents: number; categoryId: Id; isAvailable?: boolean; imageUrl?: string };
type ModifierOption = { id: Id; title: string; priceDeltaCents: number; sortOrder: number };
type Modifier = { id: Id; title: string; minSelect: number; maxSelect: number | null; options: ModifierOption[] };
type ItemModifier = { itemId: Id; modifierId: Id; isRequired: boolean };
type Table = { id: Id; label: string; isActive: boolean };
type Waiter = { id: Id; email: string; displayName: string; password?: string };
type WaiterAssignment = { waiterId: Id; tableId: Id };
type OrderItem = { itemId: Id; qty: number; modifiers?: Array<{ modifierId: Id; optionIds: Id[] }> };
type Order = { id: Id; tableId: Id; status: 'PLACED'|'ACCEPTED'|'PREPARING'|'READY'|'SERVED'|'CANCELLED'; createdAt: number; items: OrderItem[]; note?: string };

type Db = {
  store: { id: string; name: string };
  categories: Category[];
  items: Item[];
  modifiers: Modifier[];
  itemModifiers: ItemModifier[];
  tables: Table[];
  orders: Order[];
  waiters: Waiter[];
  waiterAssignments: WaiterAssignment[];
};

const LS_KEY = 'devMocks';

function uid(prefix = 'id') {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

function save(db: Db) {
  localStorage.setItem(LS_KEY, JSON.stringify(db));
}

function load(): Db {
  const raw = localStorage.getItem(LS_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Partial<Db> & { tables?: any[]; waiters?: any[]; waiterAssignments?: any[] };
      const tables: Table[] = (parsed.tables ?? []).map((table: any) => ({
        id: table.id ?? uid('table'),
        label: table.label ?? table.title ?? table.code ?? 'Table',
        isActive: typeof table.isActive === 'boolean' ? table.isActive : true,
      }));
      const waiters: Waiter[] = (parsed.waiters ?? []).map((waiter: any) => ({
        id: waiter.id ?? uid('waiter'),
        email: waiter.email,
        displayName: waiter.displayName ?? waiter.email ?? 'Waiter',
        password: waiter.password,
      }));
      return {
        store: parsed.store ?? { id: 'store_1', name: 'Demo Cafe' },
        categories: parsed.categories ?? [],
        items: parsed.items ?? [],
        modifiers: parsed.modifiers ?? [],
        itemModifiers: parsed.itemModifiers ?? [],
        tables,
        orders: parsed.orders ?? [],
        waiters,
        waiterAssignments: parsed.waiterAssignments ?? [],
      };
    } catch {}
  }
  // Seed with demo data
  const catCoffee: Category = { id: uid('cat'), title: 'Coffee', sortOrder: 0 };
  const catPastry: Category = { id: uid('cat'), title: 'Pastries', sortOrder: 1 };
  const modMilk: Modifier = { id: uid('mod'), title: 'Milk', minSelect: 0, maxSelect: 1, options: [
    { id: uid('opt'), title: 'Whole', priceDeltaCents: 0, sortOrder: 0 },
    { id: uid('opt'), title: 'Oat', priceDeltaCents: 50, sortOrder: 1 },
    { id: uid('opt'), title: 'Almond', priceDeltaCents: 70, sortOrder: 2 },
  ]};
  const modSugar: Modifier = { id: uid('mod'), title: 'Sugar', minSelect: 0, maxSelect: 1, options: [
    { id: uid('opt'), title: 'No sugar', priceDeltaCents: 0, sortOrder: 0 },
    { id: uid('opt'), title: '1 tsp', priceDeltaCents: 0, sortOrder: 1 },
    { id: uid('opt'), title: '2 tsp', priceDeltaCents: 0, sortOrder: 2 },
  ]};
  const itemEsp: Item = { id: uid('item'), title: 'Espresso', description: 'Rich and bold', priceCents: 250, categoryId: catCoffee.id, isAvailable: true };
  const itemCap: Item = { id: uid('item'), title: 'Cappuccino', description: 'Classic foam', priceCents: 350, categoryId: catCoffee.id, isAvailable: true };
  const itemCro: Item = { id: uid('item'), title: 'Croissant', description: 'Buttery & flaky', priceCents: 300, categoryId: catPastry.id, isAvailable: true };
  const db: Db = {
    store: { id: 'store_1', name: 'Demo Cafe' },
    categories: [catCoffee, catPastry],
    items: [itemEsp, itemCap, itemCro],
    modifiers: [modMilk, modSugar],
    itemModifiers: [
      { itemId: itemCap.id, modifierId: modMilk.id, isRequired: false },
      { itemId: itemCap.id, modifierId: modSugar.id, isRequired: false },
      { itemId: itemEsp.id, modifierId: modSugar.id, isRequired: false },
    ],
    tables: [
      { id: 'T1', label: 'Table 1', isActive: true },
      { id: 'T2', label: 'Table 2', isActive: true },
      { id: 'T3', label: 'Table 3', isActive: true },
    ],
    orders: [],
    waiters: [ { id: 'w1', email: 'waiter1@demo.local', displayName: 'Waiter 1', password: 'password' } ],
    waiterAssignments: [{ waiterId: 'w1', tableId: 'T1' }],
  };
  save(db);
  return db;
}

function snapshot() { return load(); }

function summarizeTable(db: Db, table: Table) {
  return {
    id: table.id,
    label: table.label,
    isActive: table.isActive,
    waiterCount: db.waiterAssignments.filter((a) => a.tableId === table.id).length,
    orderCount: db.orders.filter((o) => o.tableId === table.id).length,
  };
}

// Compose menu payload like backend
function composeMenu() {
  const db = snapshot();
  const items = db.items.map(it => ({
    ...it,
    modifiers: db.itemModifiers
      .filter(im => im.itemId === it.id)
      .map(im => {
        const m = db.modifiers.find(mm => mm.id === im.modifierId)!;
        return { id: m.id, title: m.title, minSelect: m.minSelect, maxSelect: m.maxSelect, required: im.isRequired, options: m.options };
      })
  }));
  return { categories: db.categories, items };
}

function seedOrdersIfEmpty(db: Db) {
  if (db.orders.length > 0) return;
  const t1 = db.tables.find(t=>t.id==='T1') || db.tables[0];
  const t2 = db.tables.find(t=>t.id==='T2') || db.tables[1] || db.tables[0];
  const t3 = db.tables.find(t=>t.id==='T3') || db.tables[2] || db.tables[0];
  const espresso = db.items.find(i=>i.title==='Espresso') || db.items[0];
  const cappuccino = db.items.find(i=>i.title==='Cappuccino') || db.items[1] || db.items[0];
  const croissant = db.items.find(i=>i.title==='Croissant') || db.items[2] || db.items[0];
  const milk = db.modifiers.find(m=>m.title==='Milk');
  const sugar = db.modifiers.find(m=>m.title==='Sugar');
  const oat = milk?.options.find(o=>o.title==='Oat');
  const sugar1 = sugar?.options.find(o=>o.title==='1 tsp');

  const now = Date.now();
  db.orders = [
    { id: uid('ord'), tableId: t2.id, status: 'PLACED', createdAt: now - 60_000,
      items: [ { itemId: cappuccino.id, qty: 1, modifiers: [ milk && oat ? { modifierId: milk.id, optionIds: [oat.id] } : undefined, sugar && sugar1 ? { modifierId: sugar.id, optionIds: [sugar1.id] } : undefined ].filter(Boolean) as any } ], note: 'No cocoa on top' },
    { id: uid('ord'), tableId: t1.id, status: 'PREPARING', createdAt: now - 5*60_000,
      items: [ { itemId: espresso.id, qty: 2, modifiers: [] } ], note: '' },
    { id: uid('ord'), tableId: t3.id, status: 'READY', createdAt: now - 12*60_000,
      items: [ { itemId: croissant.id, qty: 1, modifiers: [] } ], note: '' },
    { id: uid('ord'), tableId: t1.id, status: 'CANCELLED', createdAt: now - 30*60_000,
      items: [ { itemId: cappuccino.id, qty: 1, modifiers: [] } ], note: 'Changed mind' },
    { id: uid('ord'), tableId: t2.id, status: 'SERVED', createdAt: now - 55*60_000,
      items: [ { itemId: espresso.id, qty: 1, modifiers: [] } ], note: '' },
  ];
  save(db);
}

export const devMocks = {
  // Store & tables & menu
  getStore() { const db = snapshot(); return Promise.resolve({ store: db.store }); },
  getTables() {
    const db = snapshot();
    const tables = db.tables
      .filter((table) => table.isActive)
      .map((table) => ({ id: table.id, label: table.label, active: table.isActive }));
    return Promise.resolve({ tables });
  },
  getMenu() { return Promise.resolve(composeMenu()); },
  
  // Auth (offline)
  signIn(email: string, _password: string) {
    const e = email.toLowerCase();
    const role = e.startsWith('manager') ? 'manager' : e.startsWith('cook') ? 'cook' : 'waiter';
    const user = { id: uid('user'), email, role, displayName: role.charAt(0).toUpperCase() + role.slice(1) };
    return Promise.resolve({ accessToken: 'offline-token', user });
  },

  // Orders
  getOrders(params?: { status?: string; take?: number }) {
    const db = snapshot();
    seedOrdersIfEmpty(db);
    let orders = [...db.orders].sort((a,b)=> b.createdAt - a.createdAt);
    if (params?.status) orders = orders.filter(o => o.status === params.status);
    if (params?.take) orders = orders.slice(0, params.take);
    return Promise.resolve({ orders });
  },
  getOrder(orderId: Id) {
    const db = snapshot();
    const order = db.orders.find(o=>o.id===orderId);
    return Promise.resolve({ order });
  },
  getOrderQueueSummary() {
    const db = snapshot();
    seedOrdersIfEmpty(db);
    const ahead = db.orders.filter(
      (o) => o.status === 'PLACED' || o.status === 'PREPARING'
    ).length;
    return Promise.resolve({ ahead });
  },
  createOrder(data: { tableId: Id; items: any[]; note?: string }) {
    const db = snapshot();
    const order: Order = { id: uid('ord'), tableId: data.tableId, status: 'PLACED', createdAt: Date.now(), items: data.items as any, note: data.note };
    db.orders.unshift(order);
    save(db);
    return Promise.resolve({ order });
  },
  updateOrderStatus(orderId: Id, status: Order['status']) {
    const db = snapshot();
    const o = db.orders.find(x=>x.id===orderId); if (o) o.status = status;
    save(db);
    return Promise.resolve({ order: o });
  },
  managerDeleteOrder(orderId: Id) {
    const db = snapshot();
    db.orders = db.orders.filter(o=>o.id!==orderId);
    save(db);
    return Promise.resolve({ ok: true });
  },
  managerCancelOrder(orderId: Id) {
    const db = snapshot();
    const o = db.orders.find(x=>x.id===orderId); if (o) o.status = 'CANCELLED';
    save(db);
    return Promise.resolve({ order: o });
  },

  callWaiter(_tableId: Id) { return Promise.resolve({ ok: true }); },

  // Manager: tables & waiters
  managerListTables() {
    const db = snapshot();
    return Promise.resolve({ tables: db.tables.map((table) => summarizeTable(db, table)) });
  },
  managerCreateTable(data: { label: string; isActive?: boolean }) {
    const db = snapshot();
    const label = (data.label ?? '').trim();
    if (!label) return Promise.reject(new Error('Label required'));
    if (db.tables.some((t) => t.label.toLowerCase() === label.toLowerCase())) {
      return Promise.reject(new Error('Table label already exists'));
    }
    const table: Table = { id: uid('table'), label, isActive: data.isActive ?? true };
    db.tables.push(table);
    save(db);
    return Promise.resolve({ table: summarizeTable(db, table) });
  },
  managerUpdateTable(id: Id, data: { label?: string; isActive?: boolean }) {
    const db = snapshot();
    const table = db.tables.find((t) => t.id === id);
    if (!table) return Promise.reject(new Error('Table not found'));
    if (typeof data.label !== 'undefined') {
      const next = data.label.trim();
      if (!next) return Promise.reject(new Error('Label required'));
      if (
        next.toLowerCase() !== table.label.toLowerCase() &&
        db.tables.some((t) => t.label.toLowerCase() === next.toLowerCase())
      ) {
        return Promise.reject(new Error('Table label already exists'));
      }
      table.label = next;
    }
    if (typeof data.isActive !== 'undefined') {
      table.isActive = data.isActive;
    }
    save(db);
    return Promise.resolve({ table: summarizeTable(db, table) });
  },
  managerDeleteTable(id: Id) {
    const db = snapshot();
    const table = db.tables.find((t) => t.id === id);
    if (!table) return Promise.reject(new Error('Table not found'));
    table.isActive = false;
    db.waiterAssignments = db.waiterAssignments.filter((a) => a.tableId !== id);
    save(db);
    return Promise.resolve({ table: summarizeTable(db, table) });
  },

  getWaiterTables() {
    const db = snapshot();
    const waiters = db.waiters.map((waiter) => ({
      id: waiter.id,
      email: waiter.email,
      displayName: waiter.displayName,
    }));
    const tables = db.tables.map((table) => ({
      id: table.id,
      label: table.label,
      active: table.isActive,
    }));
    const assignments = db.waiterAssignments.map((assignment) => {
      const waiter = db.waiters.find((w) => w.id === assignment.waiterId);
      const table = db.tables.find((t) => t.id === assignment.tableId);
      return {
        waiterId: assignment.waiterId,
        tableId: assignment.tableId,
        waiter: waiter
          ? { id: waiter.id, email: waiter.email, displayName: waiter.displayName }
          : undefined,
        table: table
          ? { id: table.id, label: table.label, active: table.isActive }
          : undefined,
      };
    }).filter((a) => a.waiter && a.table) as Array<{
      waiterId: Id;
      tableId: Id;
      waiter: { id: Id; email: string; displayName: string };
      table: { id: Id; label: string; active: boolean };
    }>;
    return Promise.resolve({ assignments, waiters, tables });
  },
  assignWaiterTable(waiterId: Id, tableId: Id) {
    const db = snapshot();
    if (!db.waiters.find((w) => w.id === waiterId)) {
      return Promise.reject(new Error('Waiter not found'));
    }
    if (!db.tables.find((t) => t.id === tableId)) {
      return Promise.reject(new Error('Table not found'));
    }
    const exists = db.waiterAssignments.some(
      (a) => a.waiterId === waiterId && a.tableId === tableId
    );
    if (!exists) {
      db.waiterAssignments.push({ waiterId, tableId });
      save(db);
    }
    return Promise.resolve({ ok: true });
  },
  removeWaiterTable(waiterId: Id, tableId: Id) {
    const db = snapshot();
    db.waiterAssignments = db.waiterAssignments.filter(
      (a) => !(a.waiterId === waiterId && a.tableId === tableId)
    );
    save(db);
    return Promise.resolve({ ok: true });
  },
  listWaiters() {
    const db = snapshot();
    return Promise.resolve({
      waiters: db.waiters.map((w) => ({
        id: w.id,
        email: w.email,
        displayName: w.displayName,
      })),
    });
  },
  createWaiter(email: string, password: string, displayName: string) {
    const db = snapshot();
    if (db.waiters.some((w) => w.email.toLowerCase() === email.toLowerCase())) {
      return Promise.reject(new Error('Waiter email already exists'));
    }
    const waiter: Waiter = {
      id: uid('waiter'),
      email: email.toLowerCase(),
      displayName: displayName || email,
      password,
    };
    db.waiters.push(waiter);
    save(db);
    return Promise.resolve({ waiter });
  },
  updateWaiter(id: Id, data: Partial<{ email: string; password: string; displayName: string }>) {
    const db = snapshot();
    const waiter = db.waiters.find((w) => w.id === id);
    if (!waiter) return Promise.reject(new Error('Waiter not found'));
    if (data.email) {
      const next = data.email.toLowerCase();
      if (
        next !== waiter.email &&
        db.waiters.some((w) => w.email.toLowerCase() === next)
      ) {
        return Promise.reject(new Error('Waiter email already exists'));
      }
      waiter.email = next;
    }
    if (data.displayName) waiter.displayName = data.displayName;
    if (data.password) waiter.password = data.password;
    save(db);
    return Promise.resolve({ waiter });
  },
  deleteWaiter(id: Id) {
    const db = snapshot();
    db.waiters = db.waiters.filter((w) => w.id !== id);
    db.waiterAssignments = db.waiterAssignments.filter((a) => a.waiterId !== id);
    save(db);
    return Promise.resolve({ ok: true });
  },

  // Manager: categories
  listCategories() { const db = snapshot(); return Promise.resolve({ categories: db.categories }); },
  createCategory(title: string, sortOrder?: number) {
    const db = snapshot(); const c: Category = { id: uid('cat'), title, sortOrder: sortOrder ?? db.categories.length };
    db.categories.push(c); save(db); return Promise.resolve({ category: c });
  },
  updateCategory(id: Id, data: Partial<Category>) {
    const db = snapshot(); const c = db.categories.find(x=>x.id===id); if (c) Object.assign(c, data); save(db); return Promise.resolve({ category: c });
  },
  deleteCategory(id: Id) {
    const db = snapshot(); db.categories = db.categories.filter(c=>c.id!==id); save(db); return Promise.resolve({ ok: true });
  },

  // Manager: items
  listItems() { const db = snapshot(); return Promise.resolve({ items: db.items }); },
  createItem(data: Partial<Item>) {
    const db = snapshot(); const it: Item = { id: uid('item'), title: data.title || 'Item', description: data.description, priceCents: data.priceCents || 0, categoryId: data.categoryId as Id, isAvailable: data.isAvailable !== false, imageUrl: data.imageUrl };
    db.items.push(it); save(db); return Promise.resolve({ item: it });
  },
  updateItem(id: Id, data: Partial<Item>) {
    const db = snapshot(); const it = db.items.find(x=>x.id===id); if (it) Object.assign(it, data); save(db); return Promise.resolve({ item: it });
  },
  deleteItem(id: Id) { const db = snapshot(); db.items = db.items.filter(i=>i.id!==id); save(db); return Promise.resolve({ ok: true }); },

  // Manager: modifiers per item
  listModifiers() { const db = snapshot(); return Promise.resolve({ modifiers: db.modifiers }); },
  createModifier(data: { title: string; minSelect: number; maxSelect: number|null }) {
    const db = snapshot(); const m: Modifier = { id: uid('mod'), title: data.title, minSelect: data.minSelect, maxSelect: data.maxSelect, options: [] };
    db.modifiers.push(m); save(db); return Promise.resolve({ modifier: m });
  },
  updateModifier(id: Id, data: Partial<Modifier>) { const db = snapshot(); const m = db.modifiers.find(x=>x.id===id); if (m) Object.assign(m, data); save(db); return Promise.resolve({ modifier: m }); },
  deleteModifier(id: Id) { const db = snapshot(); db.modifiers = db.modifiers.filter(m=>m.id!==id); db.itemModifiers = db.itemModifiers.filter(im=>im.modifierId!==id); save(db); return Promise.resolve({ ok: true }); },
  createModifierOption(data: { modifierId: Id; title: string; priceDeltaCents: number; sortOrder: number }) { const db = snapshot(); const m = db.modifiers.find(x=>x.id===data.modifierId); const opt: ModifierOption = { id: uid('opt'), title: data.title, priceDeltaCents: data.priceDeltaCents, sortOrder: data.sortOrder }; if (m) m.options.push(opt); save(db); return Promise.resolve({ option: opt }); },
  updateModifierOption(id: Id, data: Partial<ModifierOption>) { const db = snapshot(); for (const m of db.modifiers) { const o = m.options.find(x=>x.id===id); if (o) { Object.assign(o, data); break; } } save(db); return Promise.resolve({ ok: true }); },
  deleteModifierOption(id: Id) { const db = snapshot(); for (const m of db.modifiers) { m.options = m.options.filter(o=>o.id!==id); } save(db); return Promise.resolve({ ok: true }); },
  linkItemModifier(itemId: Id, modifierId: Id, isRequired: boolean) { const db = snapshot(); db.itemModifiers.push({ itemId, modifierId, isRequired }); save(db); return Promise.resolve({ ok: true }); },
  unlinkItemModifier(itemId: Id, modifierId: Id) { const db = snapshot(); db.itemModifiers = db.itemModifiers.filter(im=> !(im.itemId===itemId && im.modifierId===modifierId)); save(db); return Promise.resolve({ ok: true }); },
};
