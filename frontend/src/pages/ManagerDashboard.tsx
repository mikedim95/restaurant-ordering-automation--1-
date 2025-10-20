import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { api } from '@/lib/api';
import { LogOut, Download, TrendingUp, Clock, DollarSign } from 'lucide-react';
import { Card } from '@/components/ui/card';

export default function ManagerDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, logout, isAuthenticated, token } = useAuthStore();
  const [orders, setOrders] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [waiters, setWaiters] = useState<any[]>([]);
  const [tables, setTables] = useState<any[]>([]);
  const [newWaiterId, setNewWaiterId] = useState("");
  const [newTableId, setNewTableId] = useState("");

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
        const ordersRes = (await api.getOrders()) as any;
        setOrders(ordersRes.orders || []);
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

  const totalRevenue = orders.reduce((sum, o: any) => sum + (o.total ?? o.totalCents / 100), 0);
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
                {orders.map((order: any) => (
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
      </div>
    </div>
  );
}
