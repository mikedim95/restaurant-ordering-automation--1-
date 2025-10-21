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
    await api.updateOrderStatus(id, 'CANCELLED');
    updateLocalStatus(id, 'CANCELLED');
    toast({ title: 'Cancelled', description: `Order ${id} cancelled` });
  };

  const markReady = async (id: string) => {
    await api.updateOrderStatus(id, 'READY');
    updateLocalStatus(id, 'READY');
    toast({ title: 'Ready', description: `Order ${id} is READY` });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-purple-600">Cook Dashboard</h1>
            <p className="text-sm text-gray-500">{user?.displayName}</p>
          </div>
          <div className="flex gap-2 items-center">
            <LanguageSwitcher />
            <Button variant="outline" size="sm" onClick={() => { logout(); navigate('/login'); }}>Logout</Button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <h2 className="text-xl font-semibold">Incoming Orders</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {incoming.map((o) => (
            <Card key={o.id} className="p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold">Table {o.tableLabel}</div>
                  <div className="text-xs text-gray-500">{new Date(o.createdAt).toLocaleTimeString()}</div>
                </div>
              </div>
              <div className="space-y-1 text-sm">
                {o.items.map((it, idx) => (
                  <div key={idx}>{it.quantity}× {it.item.name}</div>
                ))}
              </div>
              <div className="flex gap-2">
                <Button className="flex-1 inline-flex items-center justify-center gap-2" onClick={() => accept(o.id)} disabled={accepting.has(o.id)}>
                  {accepting.has(o.id) && (
                    <span className="h-4 w-4 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />
                  )}
                  {accepting.has(o.id) ? 'Accepting…' : 'Accept'}
                </Button>
                <Button className="flex-1" variant="outline" onClick={() => deny(o.id)}>Deny</Button>
              </div>
            </Card>
          ))}
        </div>

        <h2 className="text-xl font-semibold mt-8">In Preparation</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {preparing.map((o) => (
            <Card key={o.id} className="p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold">Table {o.tableLabel}</div>
                  <div className="text-xs text-gray-500">{new Date(o.createdAt).toLocaleTimeString()}</div>
                </div>
              </div>
              <div className="space-y-1 text-sm">
                {o.items.map((it, idx) => (
                  <div key={idx}>{it.quantity}× {it.item.name}</div>
                ))}
              </div>
              <div className="flex gap-2">
                <Button className="flex-1" onClick={() => markReady(o.id)}>Mark Ready</Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
