import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { OrderCard } from '@/components/waiter/OrderCard';
import { Button } from '@/components/ui/button';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { MOCK_ORDERS } from '@/lib/mockOrders';
import { Order, OrderStatus } from '@/types';
import { LogOut, Bell } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function WaiterDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, logout, isAuthenticated } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>(MOCK_ORDERS);

  useEffect(() => {
    if (!isAuthenticated() || user?.role !== 'waiter') {
      navigate('/login');
    }
  }, [isAuthenticated, user, navigate]);

  const handleUpdateStatus = (orderId: string, status: OrderStatus) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status } : o))
    );
    toast({ title: 'Order updated', description: `Status changed to ${status}` });
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-purple-600">{t('waiter.dashboard')}</h1>
            <p className="text-sm text-gray-500">{user?.displayName}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Bell className="h-4 w-4" />
            </Button>
            <LanguageSwitcher />
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
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
