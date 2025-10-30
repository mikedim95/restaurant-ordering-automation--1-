import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useOrdersStore } from '@/store/ordersStore';
import { Order, OrderStatus } from '@/types';
import { OrderCard } from '@/components/waiter/OrderCard';
import { Button } from '@/components/ui/button';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { AppBurger } from './AppBurger';
import { api } from '@/lib/api';
import { mqttService } from '@/lib/mqtt';
import { useToast } from '@/hooks/use-toast';
import { LogOut, Check, X } from 'lucide-react';
import { MqttStatus } from '@/components/MqttStatus';

type StatusKey = 'ALL' | 'PLACED' | 'PREPARING' | 'READY' | 'SERVED' | 'CANCELLED';

export default function WaiterDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { user, logout, isAuthenticated } = useAuthStore();

  const ordersAll = useOrdersStore((s) => s.orders);
  const setOrdersLocal = useOrdersStore((s) => s.setOrders);
  const upsertOrder = useOrdersStore((s) => s.upsert);
  const updateLocalStatus = useOrdersStore((s) => s.updateStatus);

  const [assignedTableIds, setAssignedTableIds] = useState<Set<string>>(new Set());
  const [assignmentsLoaded, setAssignmentsLoaded] = useState(false);
  const [storeSlug, setStoreSlug] = useState<string>('demo-cafe');
  const [lastCallTableId, setLastCallTableId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusKey>('ALL');
  const [take] = useState<number>(50);

  useEffect(() => {
    if (!isAuthenticated() || user?.role !== 'waiter') {
      navigate('/login');
    }
  }, [isAuthenticated, user, navigate]);

  // Load assignments + store slug
  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        const store = (await api.getStore()) as any;
        if (store?.store?.slug) setStoreSlug(store.store.slug);
        const tablesRes = (await api.getTables()) as any;
        const myId = user?.id;
        const next = new Set<string>();
        for (const t of tablesRes?.tables || []) {
          if ((t.waiters || []).some((w: any) => w.id === myId)) {
            next.add(t.id);
          }
        }
        setAssignedTableIds(next);
        setAssignmentsLoaded(true);
      } catch {
        // ignore
      }
    };
    fetchAssignments();
    const int = setInterval(fetchAssignments, 30000);
    return () => clearInterval(int);
  }, [user?.id]);

  // Initial hydrate from backend (always replace local cache once per mount)
  useEffect(() => {
    if (!assignmentsLoaded || !user) return;
    (async () => {
      try {
        const data = (await api.getOrders({ take })) as any;
        const mapped = (data.orders || []).map((o: any) => ({
          id: o.id,
          tableId: o.tableId,
          tableLabel: o.tableLabel ?? o.table ?? o.tableId ?? 'T',
          status: o.status,
          note: o.note,
          total: typeof o.total === 'number' ? o.total : (typeof o.totalCents === 'number' ? o.totalCents / 100 : 0),
          createdAt: o.createdAt,
          items: (o.items || []).map((it: any) => {
            const quantity = it?.quantity ?? it?.qty ?? 1;
            const price = typeof it?.unitPrice === 'number'
              ? it.unitPrice
              : typeof it?.unitPriceCents === 'number'
                ? it.unitPriceCents / 100
                : typeof it?.priceCents === 'number'
                  ? it.priceCents / 100
                  : typeof it?.price === 'number'
                    ? it.price
                    : 0;
            const name = it?.title ?? it?.name ?? it?.itemTitle ?? `Item ${String(it?.itemId || '').slice(-4)}`;
            return ({
              item: {
                id: it.itemId ?? it.id ?? name,
                name,
                description: '',
                price,
                image: '',
                category: '',
                available: true,
              },
              quantity,
              selectedModifiers: {},
            });
          }),
        })) as Order[];
        setOrdersLocal(mapped);
      } catch (e) {
        console.error('Initial orders load failed', e);
      }
    })();
  }, [assignmentsLoaded, user, setOrdersLocal, take]);

  // MQTT live updates → mutate local cache
  useEffect(() => {
    if (!assignmentsLoaded) return;
    mqttService.connect().then(() => {
      // New orders
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
        // Let the waiter know
        toast({ title: 'New order', description: `Table ${order.tableLabel}` });
      });

      // Accepted → PREPARING
      mqttService.subscribe(`stores/${storeSlug}/tables/+/accepted`, async (msg: any) => {
        if (!msg?.orderId) return;
        updateLocalStatus(msg.orderId, 'PREPARING');
        // If order wasn't in cache yet, fetch and upsert (late join)
        const exists = ordersAll.some(o => o.id === msg.orderId);
        if (!exists) {
          try {
            const res = (await api.getOrder(msg.orderId)) as any;
            if (res?.order) upsertOrder(res.order as Order);
          } catch {}
        }
      });

      // Ready
      mqttService.subscribe(`stores/${storeSlug}/tables/+/ready`, async (msg: any) => {
        if (!msg?.orderId) return;
        updateLocalStatus(msg.orderId, 'READY');
        const exists = ordersAll.some(o => o.id === msg.orderId);
        if (!exists) {
          try {
            const res = (await api.getOrder(msg.orderId)) as any;
            if (res?.order) upsertOrder(res.order as Order);
          } catch {}
        }
        toast({ title: 'Order ready', description: `Table ${msg?.tableId ?? ''}` });
      });

      // Cancelled
      mqttService.subscribe(`stores/${storeSlug}/tables/+/cancelled`, async (msg: any) => {
        if (!msg?.orderId) return;
        updateLocalStatus(msg.orderId, 'CANCELLED');
        const exists = ordersAll.some(o => o.id === msg.orderId);
        if (!exists) {
          try {
            const res = (await api.getOrder(msg.orderId)) as any;
            if (res?.order) upsertOrder(res.order as Order);
          } catch {}
        }
        toast({ title: 'Order cancelled', description: `Table ${msg?.tableId ?? ''}` });
      });

      // Call waiter
      mqttService.subscribe(`stores/${storeSlug}/tables/+/call`, (msg: any) => {
        if (!msg?.tableId) return;
        if (assignedTableIds.size > 0 && !assignedTableIds.has(msg.tableId)) return;
        setLastCallTableId(msg.tableId);
        toast({ title: 'Waiter called', description: `Table ${msg.tableId}` });
      });
    });
    return () => {
      mqttService.unsubscribe(`stores/${storeSlug}/printing`);
      mqttService.unsubscribe(`stores/${storeSlug}/tables/+/accepted`);
      mqttService.unsubscribe(`stores/${storeSlug}/tables/+/ready`);
      mqttService.unsubscribe(`stores/${storeSlug}/tables/+/call`);
      mqttService.unsubscribe(`stores/${storeSlug}/tables/+/cancelled`);
    };
  }, [assignmentsLoaded, storeSlug, assignedTableIds, upsertOrder, updateLocalStatus, toast]);

  // Derived list from local cache
  const orders = useMemo(() => {
    let list = ordersAll;
    if (user?.role === 'waiter' && assignedTableIds.size > 0) {
      list = list.filter((o) => assignedTableIds.has(o.tableId));
    }
    if (statusFilter !== 'ALL') {
      list = list.filter((o) => o.status === statusFilter);
    }
    return list;
  }, [ordersAll, user?.role, assignedTableIds, statusFilter]);

  const handleUpdateStatus = async (orderId: string, status: OrderStatus) => {
    try {
      await api.updateOrderStatus(orderId, status);
      updateLocalStatus(orderId, status);
      toast({ title: 'Order updated', description: `Status changed to ${status}` });
    } catch (err: any) {
      toast({ title: 'Update failed', description: err?.message || 'Could not update status' });
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/30 to-background">
      <header className="bg-card/80 backdrop-blur-lg border-b border-border sticky top-0 z-40 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center shadow-lg">
              <span className="text-2xl">🍽️</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-indigo-600 bg-clip-text text-transparent">{t('waiter.dashboard')}</h1>
              <p className="text-sm text-muted-foreground">{user?.displayName}</p>
            </div>
            <MqttStatus />
          </div>
          <div className="flex gap-2 items-center">
            <AppBurger title={t('waiter.dashboard')}>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!lastCallTableId}
                  onClick={() => {
                    if (!lastCallTableId) return;
                    mqttService.publish(`stores/${storeSlug}/tables/${lastCallTableId}/call/accepted`, {
                      tableId: lastCallTableId,
                      ts: new Date().toISOString(),
                    });
                    toast({ title: 'Call accepted', description: `Table ${lastCallTableId}` });
                  }}
                  className="gap-2 w-full"
                  title="Accept call"
                >
                  <Check className="h-4 w-4" /> Accept Call
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!lastCallTableId}
                  onClick={() => {
                    if (!lastCallTableId) return;
                    mqttService.publish(`stores/${storeSlug}/tables/${lastCallTableId}/call/cleared`, {
                      tableId: lastCallTableId,
                      ts: new Date().toISOString(),
                    });
                    setLastCallTableId(null);
                    toast({ title: 'Call cleared', description: `Table ${lastCallTableId}` });
                  }}
                  className="gap-2 w-full"
                  title="Clear call"
                >
                  <X className="h-4 w-4" /> Clear Call
                </Button>
              </div>
              <Button variant="outline" size="sm" onClick={handleLogout} className="w-full mt-2">
                <LogOut className="h-4 w-4" /> Logout
              </Button>
            </AppBurger>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-1 w-12 bg-gradient-to-r from-primary to-indigo-500 rounded-full" />
          <h2 className="text-2xl font-bold text-foreground">{t('waiter.orders')}</h2>
        </div>

        {/* Status filter toolbar */}
        <div className="flex flex-wrap gap-3 mb-8 p-4 bg-card/50 backdrop-blur-sm rounded-xl border border-border shadow-sm">
          {[
            { key: 'ALL', label: 'All', cls: 'bg-gradient-to-br from-gray-100 to-gray-200 text-gray-800 hover:from-gray-200 hover:to-gray-300' },
            { key: 'PLACED', label: 'Placed', cls: 'bg-gradient-to-br from-blue-100 to-blue-200 text-blue-800 hover:from-blue-200 hover:to-blue-300' },
            { key: 'PREPARING', label: 'Preparing', cls: 'bg-gradient-to-br from-amber-100 to-amber-200 text-amber-800 hover:from-amber-200 hover:to-amber-300' },
            { key: 'READY', label: 'Ready', cls: 'bg-gradient-to-br from-green-100 to-green-200 text-green-800 hover:from-green-200 hover:to-green-300' },
            { key: 'SERVED', label: 'Served', cls: 'bg-gradient-to-br from-gray-200 to-gray-300 text-gray-700 hover:from-gray-300 hover:to-gray-400' },
            { key: 'CANCELLED', label: 'Cancelled', cls: 'bg-gradient-to-br from-red-100 to-red-200 text-red-800 hover:from-red-200 hover:to-red-300' },
          ].map((b: any) => (
            <button
              key={b.key}
              onClick={() => setStatusFilter(b.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 border shadow-sm hover:shadow-md ${b.cls} ${statusFilter===b.key ? 'ring-2 ring-primary ring-offset-2 scale-105' : ''}`}
            >
              {b.label}
            </button>
          ))}
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} onUpdateStatus={handleUpdateStatus} mode="waiter" />
          ))}
        </div>
      </div>
    </div>
  );
}
