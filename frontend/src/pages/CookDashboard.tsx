import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useOrdersStore } from '@/store/ordersStore';
import { api } from '@/lib/api';
import { mqttService } from '@/lib/mqtt';
import { Order } from '@/types';
import { Button } from '@/components/ui/button';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

export default function CookDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, logout, isAuthenticated } = useAuthStore();

  const ordersAll = useOrdersStore((s) => s.orders);
  const setOrdersLocal = useOrdersStore((s) => s.setOrders);
  const upsertOrder = useOrdersStore((s) => s.upsert);
  const updateLocalStatus = useOrdersStore((s) => s.updateStatus);

  const [storeSlug, setStoreSlug] = useState('demo-cafe');
  const [accepting, setAccepting] = useState<Set<string>>(new Set());
  const [actingIds, setActingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isAuthenticated() || (user?.role !== 'cook' && user?.role !== 'manager')) {
      navigate('/login');
    }
  }, [isAuthenticated, user, navigate]);

  // Initial hydrate once
  useEffect(() => {
    const init = async () => {
      try {
        const store = (await api.getStore()) as any;
        if (store?.store?.slug) setStoreSlug(store.store.slug);
        if (ordersAll.length === 0) {
          const data = (await api.getOrders()) as any;
          const mapped = (data.orders || []).map((o: any) => ({
            id: o.id,
            tableId: o.tableId,
            tableLabel: o.tableLabel,
            status: o.status,
            note: o.note,
            total: o.total ?? o.totalCents / 100,
            createdAt: o.createdAt,
            items: (o.items || []).map((it: any) => ({
              item: {
                id: it.itemId,
                name: it.title,
                description: '',
                price: it.unitPrice ?? it.unitPriceCents / 100,
                image: '',
                category: '',
                available: true,
              },
              quantity: it.quantity,
              selectedModifiers: {},
            })),
          })) as Order[];
          setOrdersLocal(mapped);
        }
      } catch (e) {
        console.error(e);
      }
    };
    init();
  }, [ordersAll.length, setOrdersLocal]);

  // MQTT updates → local store
  useEffect(() => {
    mqttService.connect().then(() => {
      mqttService.subscribe(`stores/${storeSlug}/printing`, (msg: any) => {
        if (!msg?.orderId) return;
        const order: Order = {
          id: msg.orderId,
          tableId: msg.tableId,
          tableLabel: msg.tableLabel ?? 'Table',
          status: 'PLACED',
          note: msg.note ?? '',
          total: (msg.totalCents ?? 0) / 100,
          createdAt: msg.createdAt ?? new Date().toISOString(),
          items: (msg.items || []).map((it: any, idx: number) => ({
            item: {
              id: `ticket:${idx}:${it.title}`,
              name: it.title,
              description: '',
              price: (it.unitPriceCents ?? 0) / 100,
              image: '',
              category: '',
              available: true,
            },
            quantity: it.quantity ?? 1,
            selectedModifiers: {},
          })),
        } as Order;
        upsertOrder(order);
      });
    });
    return () => {
      mqttService.unsubscribe(`stores/${storeSlug}/printing`);
    };
  }, [storeSlug, upsertOrder]);

  const incoming = useMemo(() => ordersAll.filter(o => o.status === 'PLACED'), [ordersAll]);
  const preparing = useMemo(() => ordersAll.filter(o => o.status === 'PREPARING'), [ordersAll]);

  const accept = async (id: string) => {
    setAccepting((s) => new Set(s).add(id));
    try {
      await api.updateOrderStatus(id, 'PREPARING');
      updateLocalStatus(id, 'PREPARING');
      toast({ title: 'Preparing', description: `Order ${id} is now PREPARING` });
    } finally {
      setAccepting((s) => {
        const n = new Set(s);
        n.delete(id);
        return n;
      });
    }
  };

  const deny = async (id: string) => {
    setActingIds(s=> new Set(s).add(`deny:${id}`));
    try {
      await api.updateOrderStatus(id, 'CANCELLED');
      updateLocalStatus(id, 'CANCELLED');
      toast({ title: 'Cancelled', description: `Order ${id} cancelled` });
    } finally {
      setActingIds(s=>{ const n=new Set(s); n.delete(`deny:${id}`); return n; });
    }
  };

  const markReady = async (id: string) => {
    setActingIds(s=> new Set(s).add(`ready:${id}`));
    try {
      await api.updateOrderStatus(id, 'READY');
      updateLocalStatus(id, 'READY');
      toast({ title: 'Ready', description: `Order ${id} is READY` });
    } finally {
      setActingIds(s=>{ const n=new Set(s); n.delete(`ready:${id}`); return n; });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/30 to-background">
      <header className="bg-card/80 backdrop-blur-lg border-b border-border sticky top-0 z-40 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg">
              <span className="text-2xl">👨‍🍳</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">Cook Dashboard</h1>
              <p className="text-sm text-muted-foreground">{user?.displayName}</p>
            </div>
          </div>
          <div className="flex gap-2 items-center">
            <LanguageSwitcher />
            <Button variant="outline" size="sm" onClick={() => { logout(); navigate('/login'); }} className="shadow-sm hover:shadow-md transition-shadow">Logout</Button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        <div className="flex items-center gap-3">
          <div className="h-1 w-12 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full" />
          <h2 className="text-2xl font-bold text-foreground">Incoming Orders</h2>
          <div className="px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-sm font-semibold">{incoming.length}</div>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {incoming.map((o) => (
            <Card key={o.id} className="p-5 space-y-4 bg-gradient-to-br from-card to-accent/20 border-2 border-amber-200 hover:border-amber-400 hover:shadow-xl transition-all duration-300 animate-slide-in">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white font-bold shadow-md">
                    {o.tableLabel}
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">Table {o.tableLabel}</div>
                    <div className="text-xs text-muted-foreground">{new Date(o.createdAt).toLocaleTimeString()}</div>
                  </div>
                </div>
              </div>
              <div className="space-y-2 text-sm bg-card/50 rounded-lg p-3 border border-border">
                {o.items.map((it, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold">{it.quantity}</div>
                    <span className="text-foreground font-medium">{it.item.name}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Button className="flex-1 inline-flex items-center justify-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-md" onClick={() => accept(o.id)} disabled={accepting.has(o.id)}>
                  {accepting.has(o.id) && (
                    <span className="h-4 w-4 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />
                  )}
                  {accepting.has(o.id) ? 'Accepting…' : 'Accept'}
                </Button>
                <Button className="flex-1 inline-flex items-center justify-center gap-2 hover:shadow-md transition-shadow" variant="outline" onClick={() => deny(o.id)} disabled={actingIds.has(`deny:${o.id}`)}>
                  {actingIds.has(`deny:${o.id}`) && <span className="h-4 w-4 border-2 border-current/60 border-t-transparent rounded-full animate-spin"/>}
                  {actingIds.has(`deny:${o.id}`) ? 'Cancelling…' : 'Deny'}
                </Button>
              </div>
            </Card>
          ))}
        </div>

        <div className="flex items-center gap-3 mt-12">
          <div className="h-1 w-12 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full" />
          <h2 className="text-2xl font-bold text-foreground">In Preparation</h2>
          <div className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm font-semibold">{preparing.length}</div>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {preparing.map((o) => (
            <Card key={o.id} className="p-5 space-y-4 bg-gradient-to-br from-card to-accent/20 border-2 border-blue-200 hover:border-blue-400 hover:shadow-xl transition-all duration-300">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold shadow-md">
                    {o.tableLabel}
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">Table {o.tableLabel}</div>
                    <div className="text-xs text-muted-foreground">{new Date(o.createdAt).toLocaleTimeString()}</div>
                  </div>
                </div>
              </div>
              <div className="space-y-2 text-sm bg-card/50 rounded-lg p-3 border border-border">
                {o.items.map((it, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">{it.quantity}</div>
                    <span className="text-foreground font-medium">{it.item.name}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Button className="flex-1 inline-flex items-center justify-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-md" onClick={() => markReady(o.id)} disabled={actingIds.has(`ready:${o.id}`)}>
                  {actingIds.has(`ready:${o.id}`) && <span className="h-4 w-4 border-2 border-white/60 border-t-transparent rounded-full animate-spin"/>}
                  {actingIds.has(`ready:${o.id}`) ? 'Marking…' : 'Mark Ready'}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
