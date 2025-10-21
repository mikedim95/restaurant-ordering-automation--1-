import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { OrderCard } from '@/components/waiter/OrderCard';
import { Button } from '@/components/ui/button';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { HomeLink } from '@/components/HomeLink';
import { AppBurger } from './AppBurger';
import { api } from '@/lib/api';
import { mqttService } from '@/lib/mqtt';
import { Order, OrderStatus } from '@/types';
import { LogOut, Bell, Check, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function WaiterDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, logout, isAuthenticated } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [assignedTableIds, setAssignedTableIds] = useState<Set<string>>(new Set());
  const [assignmentsLoaded, setAssignmentsLoaded] = useState(false);
  const assignedKey = Array.from(assignedTableIds).sort().join(',');
  const [storeSlug, setStoreSlug] = useState<string>('demo-cafe');
  const [lastCallTableId, setLastCallTableId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState<boolean>(false);

  useEffect(() => {
    if (!isAuthenticated() || user?.role !== 'waiter') {
      navigate('/login');
    }
  }, [isAuthenticated, user, navigate]);

  // Fetch orders helper
  const fetchOrders = async () => {
      try {
        // Ask backend for a smaller slice to keep things snappy
        const data = (await api.getOrders({ take: 50 })) as any;
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
        let filtered = user?.role === 'waiter'
          ? mapped.filter((o) => assignedTableIds.has(o.tableId))
          : mapped;
        if (!showAll) {
          filtered = filtered.filter((o) => o.status !== 'CANCELLED' && o.status !== 'SERVED');
        }
        setOrders(filtered);
      } catch (err) {
        console.error('Failed to fetch orders', err);
      }
  };

  // Fetch assignments when user changes, and only update state if changed
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
        // Only update if changed to avoid rerender loops
        const curr = assignedTableIds;
        const same = curr.size === next.size && Array.from(next).every((id) => curr.has(id));
        if (!same) setAssignedTableIds(next);
        setAssignmentsLoaded(true);
      } catch (e) {
        // ignore if fails
      }
    };

    fetchAssignments();
    // Optionally refresh assignments periodically (e.g., every 30s)
    const int = setInterval(fetchAssignments, 30000);
    return () => clearInterval(int);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Setup MQTT subscriptions; rewire when assignments change
  useEffect(() => {
    if (!assignmentsLoaded && user?.role === 'waiter') return;
    fetchOrders();
    mqttService.connect().then(() => {
      mqttService.subscribe(`stores/${storeSlug}/printing`, (msg) => {
        if (!msg?.tableId || !assignedTableIds.has(msg.tableId)) return;
        toast({ title: 'New order', description: `Table ${msg.tableId}` });
        fetchOrders();
      });
      mqttService.subscribe(`stores/${storeSlug}/tables/+/accepted`, (msg) => {
        if (!msg?.tableId || !assignedTableIds.has(msg.tableId)) return;
        toast({ title: 'Order accepted', description: `Table ${msg.tableId}` });
        fetchOrders();
      });
      mqttService.subscribe(`stores/${storeSlug}/tables/+/ready`, (msg) => {
        if (!msg?.tableId || !assignedTableIds.has(msg.tableId)) return;
        toast({ title: 'Order ready', description: `Table ${msg.tableId}` });
        fetchOrders();
      });
      mqttService.subscribe(`stores/${storeSlug}/tables/+/call`, (msg) => {
        if (!msg?.tableId) return;
        if (assignedTableIds.size > 0 && !assignedTableIds.has(msg.tableId)) return;
        setLastCallTableId(msg.tableId);
        toast({ title: 'Waiter called', description: `Table ${msg.tableId}` });
      });
    });

    return () => {
      mqttService.unsubscribe(`stores/${storeSlug}/printing`);
      mqttService.unsubscribe(`stores/${storeSlug}/tables/+/ready`);
      mqttService.unsubscribe(`stores/${storeSlug}/tables/+/accepted`);
      mqttService.unsubscribe(`stores/${storeSlug}/tables/+/call`);
    };
    // Re-subscribe when assigned tables or slug change
  }, [assignedKey, assignmentsLoaded, storeSlug]);

  const handleUpdateStatus = async (orderId: string, status: OrderStatus) => {
    try {
      await api.updateOrderStatus(orderId, status);
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status } : o)));
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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div>
              <h1 className="text-2xl font-bold text-purple-600">{t('waiter.dashboard')}</h1>
              <p className="text-sm text-gray-500">{user?.displayName}</p>
            </div>
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
              <div className="mt-3 space-y-2">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />
                  Show all orders (incl. cancelled/served)
                </label>
                <Button variant="outline" size="sm" className="w-full" onClick={() => setOrders((prev) => prev.filter((o) => o.status !== 'CANCELLED'))}>
                  Clear cancelled from view
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
        <h2 className="text-xl font-semibold mb-6">{t('waiter.orders')}</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {orders.filter((o) => o.status !== 'SERVED').map((order) => (
            <OrderCard key={order.id} order={order} onUpdateStatus={handleUpdateStatus} />
          ))}
        </div>
      </div>
    </div>
  );
}
