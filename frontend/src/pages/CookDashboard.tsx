import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { HomeLink } from '@/components/HomeLink';
import { AppBurger } from './AppBurger';
import { Order } from '@/types';
import { Card } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { mqttService } from '@/lib/mqtt';

export default function CookDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, logout, isAuthenticated } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [storeSlug, setStoreSlug] = useState<string>('demo-cafe');

  useEffect(() => {
    if (!isAuthenticated() || user?.role !== 'cook') {
      navigate('/login');
    }
  }, [isAuthenticated, user, navigate]);

  const load = async () => {
    try {
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
      setOrders(mapped);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        const store = (await api.getStore()) as any;
        if (store?.store?.slug) setStoreSlug(store.store.slug);
      } catch {}
      await load();
    };
    init();
  }, []);

  // Live updates via MQTT: new orders (printing), ready events (from other devices/NodeMCU), accepted (multi-cook)
  useEffect(() => {
    let mounted = true;
    mqttService.connect().then(() => {
      if (!mounted) return;
      mqttService.subscribe(`stores/${storeSlug}/printing`, () => {
        load();
      });
      mqttService.subscribe(`stores/${storeSlug}/tables/+/ready`, () => {
        load();
      });
      mqttService.subscribe(`stores/${storeSlug}/tables/+/accepted`, () => {
        load();
      });
    });
    return () => {
      mounted = false;
      mqttService.unsubscribe(`stores/${storeSlug}/printing`);
      mqttService.unsubscribe(`stores/${storeSlug}/tables/+/ready`);
      mqttService.unsubscribe(`stores/${storeSlug}/tables/+/accepted`);
      mqttService.disconnect();
    };
  }, [storeSlug]);

  // Fallback polling when MQTT is not connected
  useEffect(() => {
    const iv = setInterval(() => {
      if (!mqttService.isConnected()) {
        load();
      }
    }, 8000);
    return () => clearInterval(iv);
  }, []);

  const accept = async (id: string) => {
    await api.updateOrderStatus(id, 'PREPARING');
    toast({ title: 'Accepted', description: `Order ${id} is now PREPARING` });
    load();
  };

  const deny = async (id: string) => {
    await api.updateOrderStatus(id, 'CANCELLED');
    toast({ title: 'Cancelled', description: `Order ${id} cancelled` });
    load();
  };

  const markReady = async (id: string) => {
    await api.updateOrderStatus(id, 'READY');
    toast({ title: 'Ready', description: `Order ${id} is READY` });
    load();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div>
              <h1 className="text-2xl font-bold text-purple-600">Cook Dashboard</h1>
              <p className="text-sm text-gray-500">{user?.displayName}</p>
            </div>
          </div>
          <div className="flex gap-2 items-center">
            <AppBurger title="Cook Dashboard">
              <Button variant="outline" size="sm" onClick={() => { logout(); navigate('/login'); }} className="w-full">Logout</Button>
            </AppBurger>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <h2 className="text-xl font-semibold">Incoming Orders</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {orders
            .filter((o) => o.status === 'PLACED')
            .map((o) => (
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
                  <Button className="flex-1" onClick={() => accept(o.id)}>Accept</Button>
                  <Button className="flex-1" variant="outline" onClick={() => deny(o.id)}>Deny</Button>
                </div>
              </Card>
            ))}
        </div>

        <h2 className="text-xl font-semibold mt-8">In Preparation</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {orders
            .filter((o) => o.status === 'PREPARING')
            .map((o) => (
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
