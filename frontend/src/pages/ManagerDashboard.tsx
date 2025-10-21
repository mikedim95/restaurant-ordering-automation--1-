import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { HomeLink } from '@/components/HomeLink';
import { AppBurger } from './AppBurger';
import { api } from '@/lib/api';
import { useOrdersStore } from '@/store/ordersStore';
import { LogOut, Download, TrendingUp, Clock, DollarSign, Pencil, Trash2, Plus } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export default function ManagerDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, logout, isAuthenticated, token } = useAuthStore();
  const ordersAll = useOrdersStore((s) => s.orders);
  const setOrdersLocal = useOrdersStore((s) => s.setOrders);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [waiters, setWaiters] = useState<any[]>([]);
  const [tables, setTables] = useState<any[]>([]);
  const [newWaiterId, setNewWaiterId] = useState("");
  const [newTableId, setNewTableId] = useState("");
  // Waiter CRUD
  const [newWaiter, setNewWaiter] = useState({ email: '', password: '', displayName: '' });
  // Items CRUD (basic)
  const [items, setItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [newItem, setNewItem] = useState({ title: '', description: '', priceCents: 0, categoryId: '' });
  // Item modal
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [itemForm, setItemForm] = useState({ title: '', description: '', price: '0.00', categoryId: '', isAvailable: true });

  useEffect(() => {
    if (!isAuthenticated() || user?.role !== 'manager') {
      navigate('/login');
    }
  }, [isAuthenticated, user, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  useEffect(() => {
    const init = async () => {
      try {
        if (ordersAll.length === 0) {
          const ordersRes = (await api.getOrders()) as any;
          setOrdersLocal(ordersRes.orders || []);
        }
      } catch (e) {
        // ignore for now
      }
      try {
        const data = (await api.getWaiterTables()) as any;
        setAssignments(data.assignments || []);
        setWaiters(data.waiters || []);
        setTables(data.tables || []);
      } catch (e) {
        // ignore for now
      }
      try {
        const itemsRes = (await api.listItems()) as any;
        setItems(itemsRes.items || []);
        const storeRes = (await api.getMenu()) as any;
        setCategories(storeRes.categories || []);
        if (!newItem.categoryId && (storeRes.categories || []).length) {
          setNewItem((p) => ({ ...p, categoryId: storeRes.categories[0].id }));
        }
      } catch (e) {}
    };
    if (isAuthenticated() && user?.role === 'manager') {
      init();
    }
  }, [isAuthenticated, user]);

  const handleAssign = async () => {
    if (!newWaiterId || !newTableId) return;
    const res = (await api.assignWaiterTable(newWaiterId, newTableId)) as any;
    setAssignments((prev) => {
      const existing = prev.find(
        (a: any) => a.waiterId === res.assignment.waiterId && a.tableId === res.assignment.tableId
      );
      if (existing) return prev;
      return [...prev, res.assignment];
    });
  };

  const handleRemove = async (waiterId: string, tableId: string) => {
    await api.removeWaiterTable(waiterId, tableId);
    setAssignments((prev) => prev.filter((a: any) => !(a.waiterId === waiterId && a.tableId === tableId)));
  };

  const totalRevenue = ordersAll.reduce((sum, o: any) => sum + (o.total ?? o.totalCents / 100), 0);
  const avgOrderTime = 12; // minutes

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div>
              <h1 className="text-2xl font-bold text-purple-600">{t('manager.dashboard')}</h1>
              <p className="text-sm text-gray-500">{user?.displayName}</p>
            </div>
          </div>
          <div className="flex gap-2 items-center">
            <AppBurger title={t('manager.dashboard')}>
              <Button variant="outline" size="sm" onClick={handleLogout} className="w-full">Logout</Button>
            </AppBurger>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Revenue</p>
                <p className="text-2xl font-bold">€{totalRevenue.toFixed(2)}</p>
              </div>
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Orders</p>
                <p className="text-2xl font-bold">{ordersAll.length}</p>
              </div>
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Clock className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Avg Time</p>
                <p className="text-2xl font-bold">{avgOrderTime}m</p>
              </div>
            </div>
          </Card>
        </div>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Recent Orders</h2>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b">
                <tr className="text-left">
                  <th className="pb-3 font-medium">Table</th>
                  <th className="pb-3 font-medium">Items</th>
                  <th className="pb-3 font-medium">Total</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Time</th>
                </tr>
              </thead>
              <tbody>
                {ordersAll.map((order: any) => (
                  <tr key={order.id} className="border-b">
                    <td className="py-3">{order.tableLabel}</td>
                    <td className="py-3">{order.items.length}</td>
                    <td className="py-3">€{(order.total ?? order.totalCents/100).toFixed(2)}</td>
                    <td className="py-3">
                      <span className="px-2 py-1 rounded text-xs bg-gray-100">{order.status}</span>
                    </td>
                    <td className="py-3 text-sm text-gray-500">
                      {new Date(order.createdAt).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="grid md:grid-cols-2 gap-6 mt-8">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Waiter Assignments</h2>
            <div className="space-y-3">
              {assignments.length === 0 && (
                <p className="text-sm text-gray-500">No assignments yet</p>
              )}
              {assignments.map((a: any) => (
                <div key={`${a.waiterId}-${a.tableId}`} className="flex items-center justify-between border-b pb-2">
                  <div>
                    <div className="font-medium">{a.waiter.displayName}</div>
                    <div className="text-sm text-gray-500">Table {a.table.label}</div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handleRemove(a.waiterId, a.tableId)}>Remove</Button>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Assign Waiter to Table</h2>
            <div className="flex gap-3">
              <select className="border rounded p-2 flex-1" value={newWaiterId} onChange={(e) => setNewWaiterId(e.target.value)}>
                <option value="">Select waiter</option>
                {waiters.map((w: any) => (
                  <option key={w.id} value={w.id}>{w.displayName}</option>
                ))}
              </select>
              <select className="border rounded p-2 flex-1" value={newTableId} onChange={(e) => setNewTableId(e.target.value)}>
                <option value="">Select table</option>
                {tables.map((t: any) => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            </div>
            <Button className="mt-4" onClick={handleAssign} disabled={!newWaiterId || !newTableId}>Assign</Button>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mt-8">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Manage Waiters</h2>
            <div className="flex gap-2 mb-3">
              <input className="border rounded p-2 flex-1" placeholder="Email" value={newWaiter.email} onChange={(e) => setNewWaiter({...newWaiter, email: e.target.value})} />
              <input className="border rounded p-2 flex-1" placeholder="Display name" value={newWaiter.displayName} onChange={(e) => setNewWaiter({...newWaiter, displayName: e.target.value})} />
              <input className="border rounded p-2 flex-1" placeholder="Password" type="password" value={newWaiter.password} onChange={(e) => setNewWaiter({...newWaiter, password: e.target.value})} />
              <Button onClick={async () => {
                if (!newWaiter.email || !newWaiter.password || !newWaiter.displayName) return;
                await api.createWaiter(newWaiter.email, newWaiter.password, newWaiter.displayName);
                const res = await api.listWaiters() as any; setWaiters(res.waiters || []);
                setNewWaiter({ email: '', password: '', displayName: '' });
              }}>Add</Button>
            </div>
            <div className="space-y-2">
              {waiters.map((w: any) => (
                <div key={w.id} className="flex items-center justify-between border rounded p-2">
                  <div>
                    <div className="font-medium">{w.displayName}</div>
                    <div className="text-xs text-gray-500">{w.email}</div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={async () => { await api.updateWaiter(w.id, { password: 'changeme' }); }}>Reset Pass</Button>
                    <Button variant="destructive" size="sm" onClick={async () => { await api.deleteWaiter(w.id); const res = await api.listWaiters() as any; setWaiters(res.waiters || []); }}>Delete</Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Manage Menu Items</h2>
            <div className="text-sm text-gray-600 mb-3">Use the Add button in each category below to create a new item. Tap Edit to change details.</div>
            <div className="space-y-8">
              {categories.map((cat: any) => {
                const catItems = items.filter((it: any) => it.categoryId === cat.id || it.category === cat.title);
                return (
                  <section key={cat.id}>
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-lg font-semibold text-gray-800">{cat.title}</h3>
                      <div className="h-px bg-gray-200 flex-1" />
                      <Button size="sm" className="gap-2" onClick={() => {
                        setEditingItem(null);
                        setItemForm({ title: '', description: '', price: '0.00', categoryId: cat.id, isAvailable: true });
                        setItemModalOpen(true);
                      }}>
                        <Plus className="h-4 w-4" /> Add
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {catItems.length === 0 ? (
                        <div className="text-xs text-gray-500">No items in this category.</div>
                      ) : catItems.map((it: any) => (
                        <div key={it.id} className="flex items-center justify-between border rounded-lg p-3">
                          <div>
                            <div className="font-medium">{it.title} <span className="text-xs text-gray-500">€{(it.priceCents/100).toFixed(2)}</span></div>
                            <div className="text-xs text-gray-500">{it.description || '—'}</div>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" className="gap-1" onClick={() => {
                              setEditingItem(it);
                              setItemForm({ title: it.title, description: it.description || '', price: (it.priceCents/100).toFixed(2), categoryId: it.categoryId, isAvailable: !!it.isAvailable });
                              setItemModalOpen(true);
                            }}>
                              <Pencil className="h-4 w-4" /> Edit
                            </Button>
                            <Button variant="destructive" size="sm" className="gap-1" onClick={async () => {
                              await api.deleteItem(it.id);
                              const res = await api.listItems() as any; setItems(res.items||[]);
                            }}>
                              <Trash2 className="h-4 w-4" /> Delete
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Item Add/Edit Modal */}
        <Dialog open={itemModalOpen} onOpenChange={setItemModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Edit Item' : 'Add Item'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Title" value={itemForm.title} onChange={(e) => setItemForm({ ...itemForm, title: e.target.value })} />
              <Textarea placeholder="Description" value={itemForm.description} onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })} />
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Price (€)" type="number" min={0} step={0.01} value={itemForm.price} onChange={(e) => setItemForm({ ...itemForm, price: e.target.value })} />
                <select className="border rounded p-2" value={itemForm.categoryId} onChange={(e) => setItemForm({ ...itemForm, categoryId: e.target.value })}>
                  {categories.map((c: any) => (<option key={c.id} value={c.id}>{c.title}</option>))}
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={itemForm.isAvailable} onChange={(e) => setItemForm({ ...itemForm, isAvailable: e.target.checked })} /> Available</label>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setItemModalOpen(false)}>Cancel</Button>
              <Button onClick={async () => {
                if (!itemForm.title || !itemForm.categoryId) return;
                const payload = { title: itemForm.title, description: itemForm.description, priceCents: Math.round(parseFloat(itemForm.price || '0')*100), categoryId: itemForm.categoryId, isAvailable: itemForm.isAvailable };
                if (editingItem) await api.updateItem(editingItem.id, payload); else await api.createItem(payload);
                const res = await api.listItems() as any; setItems(res.items||[]);
                setItemModalOpen(false);
              }}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
