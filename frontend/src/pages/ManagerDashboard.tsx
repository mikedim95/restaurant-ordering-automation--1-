import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { MOCK_ORDERS } from '@/lib/mockOrders';
import { LogOut, Download, TrendingUp, Clock, DollarSign } from 'lucide-react';
import { Card } from '@/components/ui/card';

export default function ManagerDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, logout, isAuthenticated } = useAuthStore();
  const [orders] = useState(MOCK_ORDERS);

  useEffect(() => {
    if (!isAuthenticated() || user?.role !== 'manager') {
      navigate('/login');
    }
  }, [isAuthenticated, user, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
  const avgOrderTime = 12; // minutes

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-purple-600">{t('manager.dashboard')}</h1>
            <p className="text-sm text-gray-500">{user?.displayName}</p>
          </div>
          <div className="flex gap-2">
            <LanguageSwitcher />
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
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
                <p className="text-2xl font-bold">{orders.length}</p>
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
                {orders.map((order) => (
                  <tr key={order.id} className="border-b">
                    <td className="py-3">{order.tableLabel}</td>
                    <td className="py-3">{order.items.length}</td>
                    <td className="py-3">€{order.total.toFixed(2)}</td>
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
      </div>
    </div>
  );
}
