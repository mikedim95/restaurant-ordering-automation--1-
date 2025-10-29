import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useOrdersStore } from '@/store/ordersStore';
import { Button } from '@/components/ui/button';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { AppBurger } from './AppBurger';
import { api } from '@/lib/api';
import {
  LogOut,
  TrendingUp,
  Clock,
  DollarSign,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { ManagerMenuPanel } from './manager/ManagerMenuPanel';
import { OrdersAnalytics } from '@/components/manager/OrdersAnalytics';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';

export default function ManagerDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, logout, isAuthenticated } = useAuthStore();

  const ordersAll = useOrdersStore((s) => s.orders);
  const setOrdersLocal = useOrdersStore((s) => s.setOrders);

  const [assignments, setAssignments] = useState<any[]>([]);
  const [waiters, setWaiters] = useState<any[]>([]);
  const [tables, setTables] = useState<any[]>([]);
  const [loadingWaiters, setLoadingWaiters] = useState(true);
  const [managerTables, setManagerTables] = useState<any[]>([]);
  const [loadingTables, setLoadingTables] = useState(true);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [activeWaiter, setActiveWaiter] = useState<any | null>(null);
  const [initialTableSelection, setInitialTableSelection] = useState<Set<string>>(new Set());
  const [tableSelection, setTableSelection] = useState<Set<string>>(new Set());
  const [savingWaiter, setSavingWaiter] = useState(false);

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newWaiter, setNewWaiter] = useState({ email: '', displayName: '', password: '' });
  const [addingWaiter, setAddingWaiter] = useState(false);
  const [deletingWaiterId, setDeletingWaiterId] = useState<string | null>(null);
  const [insightsOpen, setInsightsOpen] = useState(true);

  const [tableModalOpen, setTableModalOpen] = useState(false);
  const [tableForm, setTableForm] = useState<{ id?: string; label: string; isActive: boolean }>({
    label: '',
    isActive: true,
  });
  const [savingTable, setSavingTable] = useState(false);
  const [tableDeletingId, setTableDeletingId] = useState<string | null>(null);
  const [waiterSectionOpen, setWaiterSectionOpen] = useState(true);
  const [tableSectionOpen, setTableSectionOpen] = useState(true);

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
    const initOrders = async () => {
      try {
        if (ordersAll.length === 0) {
          const ordersRes = (await api.getOrders()) as any;
          setOrdersLocal(ordersRes.orders || []);
        }
      } catch (error) {
        console.error('Failed to load orders', error);
      }
    };
    if (isAuthenticated() && user?.role === 'manager') initOrders();
  }, [isAuthenticated, user, ordersAll.length, setOrdersLocal]);

  const loadWaiterData = async () => {
    setLoadingWaiters(true);
    try {
      const data = (await api.getWaiterTables()) as any;
      setAssignments(data.assignments || []);
      setWaiters(data.waiters || []);
    } catch (error) {
      console.error('Failed to load waiter data', error);
    } finally {
      setLoadingWaiters(false);
    }
  };

  const loadManagerTables = async () => {
    setLoadingTables(true);
    try {
      const data = (await api.managerListTables()) as any;
      const list = (data.tables || []).map((table: any) => ({
        id: table.id,
        label: table.label,
        isActive: typeof table.isActive === 'boolean' ? table.isActive : Boolean(table.active),
        waiterCount: table.waiterCount ?? 0,
        orderCount: table.orderCount ?? 0,
      }));
      setManagerTables(list);
      setTables(list.map((table) => ({ id: table.id, label: table.label, active: table.isActive })));
    } catch (error) {
      console.error('Failed to load tables', error);
    } finally {
      setLoadingTables(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated() && user?.role === 'manager') {
      loadWaiterData();
      loadManagerTables();
    }
  }, [isAuthenticated, user]);

  const waiterAssignmentsMap = useMemo(() => {
    const map = new Map<string, any[]>();
    assignments.forEach((assignment) => {
      const current = map.get(assignment.waiterId) || [];
      current.push(assignment.table);
      map.set(assignment.waiterId, current);
    });
    return map;
  }, [assignments]);

  const waitersByTable = useMemo(() => {
    const map = new Map<string, any[]>();
    assignments.forEach((assignment) => {
      if (!assignment?.tableId || !assignment?.waiter) return;
      const current = map.get(assignment.tableId) || [];
      current.push(assignment.waiter);
      map.set(assignment.tableId, current);
    });
    return map;
  }, [assignments]);

  const openEditWaiter = (waiter: any) => {
    const assignedIds = (waiterAssignmentsMap.get(waiter.id) || []).map((table: any) => table.id);
    setActiveWaiter({ ...waiter, originalDisplayName: waiter.displayName });
    setTableSelection(new Set(assignedIds));
    setInitialTableSelection(new Set(assignedIds));
    setEditModalOpen(true);
  };

  const tablesById = useMemo(() => {
    const map = new Map<string, any>();
    tables.forEach((table) => {
      map.set(table.id, table);
    });
    return map;
  }, [tables]);

  const sortedWaiters = useMemo(() => {
    return [...waiters].sort((a, b) => {
      const left = (a.displayName || a.email || '').toLowerCase();
      const right = (b.displayName || b.email || '').toLowerCase();
      return left.localeCompare(right);
    });
  }, [waiters]);

  const sortedTables = useMemo(() => {
    return [...managerTables].sort((a, b) =>
      (a.label || '').toLowerCase().localeCompare((b.label || '').toLowerCase())
    );
  }, [managerTables]);

  const openCreateTable = () => {
    setTableForm({ id: undefined, label: '', isActive: true });
    setTableModalOpen(true);
  };

  const openEditTable = (table: any) => {
    setTableForm({ id: table.id, label: table.label, isActive: table.isActive });
    setTableModalOpen(true);
  };

  const handleSaveTable = async () => {
    const label = tableForm.label.trim();
    if (!label) return;
    setSavingTable(true);
    try {
      if (tableForm.id) {
        await api.managerUpdateTable(tableForm.id, { label, isActive: tableForm.isActive });
      } else {
        await api.managerCreateTable({ label, isActive: tableForm.isActive });
      }
      await loadManagerTables();
      await loadWaiterData();
      setTableModalOpen(false);
      setTableForm({ id: undefined, label: '', isActive: true });
    } catch (error) {
      console.error('Failed to save table', error);
    } finally {
      setSavingTable(false);
    }
  };

  const handleDeleteTable = async (tableId: string) => {
    if (!window.confirm('Delete this table? It will be marked inactive and unassigned from waiters.')) return;
    setTableDeletingId(tableId);
    try {
      await api.managerDeleteTable(tableId);
      await loadManagerTables();
      await loadWaiterData();
    } catch (error) {
      console.error('Failed to delete table', error);
    } finally {
      setTableDeletingId(null);
    }
  };

  const closeEditModal = (open: boolean) => {
    setEditModalOpen(open);
    if (!open) {
      setActiveWaiter(null);
      setTableSelection(new Set());
      setInitialTableSelection(new Set());
    }
  };

  const handleToggleTable = (tableId: string, checked: boolean) => {
    setTableSelection((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(tableId);
      } else {
        next.delete(tableId);
      }
      return next;
    });
  };

  const handleSaveWaiter = async () => {
    if (!activeWaiter) return;
    setSavingWaiter(true);
    try {
      const desired = new Set(tableSelection);
      const current = new Set(initialTableSelection);

      const toAdd = Array.from(desired).filter((id) => !current.has(id));
      const toRemove = Array.from(current).filter((id) => !desired.has(id));

      const ops: Promise<any>[] = [];
      const trimmedName = (activeWaiter.displayName || '').trim();
      const originalName = activeWaiter.originalDisplayName || '';
      if (trimmedName && trimmedName !== originalName) {
        ops.push(api.updateWaiter(activeWaiter.id, { displayName: trimmedName }));
      }
      toAdd.forEach((tableId) => ops.push(api.assignWaiterTable(activeWaiter.id, tableId)));
      toRemove.forEach((tableId) => ops.push(api.removeWaiterTable(activeWaiter.id, tableId)));

      if (ops.length) {
        await Promise.all(ops);
      }
      await loadWaiterData();
      closeEditModal(false);
    } catch (error) {
      console.error('Failed to save waiter changes', error);
    } finally {
      setSavingWaiter(false);
    }
  };

  const handleDeleteWaiter = async (waiterId: string) => {
    if (!window.confirm('Delete this waiter account?')) return;
    setDeletingWaiterId(waiterId);
    try {
      await api.deleteWaiter(waiterId);
      await loadWaiterData();
    } catch (error) {
      console.error('Failed to delete waiter', error);
    } finally {
      setDeletingWaiterId(null);
    }
  };

  const handleCreateWaiter = async () => {
    if (!newWaiter.email || !newWaiter.password) return;
    setAddingWaiter(true);
    try {
      const displayName = newWaiter.displayName.trim() || newWaiter.email;
      await api.createWaiter(newWaiter.email, newWaiter.password, displayName);
      setNewWaiter({ email: '', displayName: '', password: '' });
      setAddModalOpen(false);
      await loadWaiterData();
    } catch (error) {
      console.error('Failed to create waiter', error);
    } finally {
      setAddingWaiter(false);
    }
  };

  const totalRevenue = ordersAll.reduce((sum, order: any) => {
    if (typeof order.total === 'number' && !Number.isNaN(order.total)) return sum + order.total;
    if (typeof order.totalCents === 'number' && !Number.isNaN(order.totalCents)) return sum + order.totalCents / 100;
    return sum;
  }, 0);
  const avgOrderTime = 12;

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
            <LanguageSwitcher />
            <AppBurger title={t('manager.dashboard')}>
              <Button variant="outline" size="sm" onClick={handleLogout} className="w-full">
                <LogOut className="mr-2 h-4 w-4" /> Logout
              </Button>
            </AppBurger>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        <Card className="p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <div>
              <h2 className="text-xl font-semibold">Business Insights</h2>
              <p className="text-sm text-muted-foreground">
                Quick snapshot of revenue and order flow.
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setInsightsOpen((prev) => !prev)}
              aria-label={insightsOpen ? 'Collapse business insights' : 'Expand business insights'}
            >
              {insightsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
          {insightsOpen && (
            <div className="grid md:grid-cols-3 gap-6">
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
          )}
        </Card>

        <ManagerMenuPanel />

        <OrdersAnalytics orders={ordersAll} />

        <Card className="p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <div>
              <h2 className="text-xl font-semibold">Waiter Management</h2>
              <p className="text-sm text-muted-foreground">
                Assign tables to waiters and manage their accounts.
              </p>
            </div>
            <div className="flex items-center gap-2 self-start md:self-auto">
              <Button onClick={() => setAddModalOpen(true)} className="inline-flex items-center gap-2">
                <Plus className="h-4 w-4" /> Add waiter
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setWaiterSectionOpen((prev) => !prev)}
                aria-label={waiterSectionOpen ? 'Collapse waiter section' : 'Expand waiter section'}
              >
                {waiterSectionOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {waiterSectionOpen && (loadingWaiters ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, idx) => (
                <Skeleton key={idx} className="h-20 w-full rounded-xl" />
              ))}
            </div>
          ) : waiters.length === 0 ? (
            <p className="text-sm text-muted-foreground">No waiters yet. Add your first waiter to get started.</p>
          ) : (
            <div className="space-y-3">
              {sortedWaiters.map((waiter) => {
                const assignedRaw = waiterAssignmentsMap.get(waiter.id) || [];
                const assignedTables = assignedRaw
                  .map((assignment: any) => {
                    const stored = tablesById.get(assignment.id);
                    const label =
                      stored?.label ??
                      stored?.code ??
                      assignment.label ??
                      assignment.code ??
                      assignment.title ??
                      'â€”';
                    return {
                      id: assignment.id,
                      label,
                      area: stored?.area ?? stored?.areaLabel ?? assignment.area ?? null,
                      active: stored?.active ?? assignment.active ?? true,
                    };
                  })
                  .sort((a: any, b: any) => a.label.localeCompare(b.label));
                const activeCount = assignedTables.filter((table: any) => table.active).length;

                return (
                  <div
                    key={waiter.id}
                    className="border border-border/60 rounded-xl p-4 bg-white flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="flex-1 space-y-3">
                      <div>
                        <p className="font-semibold text-foreground">{waiter.displayName}</p>
                        <p className="text-xs text-muted-foreground">{waiter.email}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className="border-dashed">
                          {activeCount} active table{activeCount === 1 ? '' : 's'}
                        </Badge>
                        <Badge variant="outline" className="border-dashed">
                          {assignedTables.length} total assignment{assignedTables.length === 1 ? '' : 's'}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {assignedTables.length ? (
                          assignedTables.map((table: any) => (
                            <Badge
                              key={table.id}
                              variant={table.active ? 'secondary' : 'outline'}
                              className={!table.active ? 'opacity-75 border-dashed' : ''}
                            >
                              Table {table.label}
                              {table.area ? ` · ${table.area}` : ''}
                              {!table.active ? ' (inactive)' : ''}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground">No tables assigned</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEditWaiter(waiter)}>
                        <Pencil className="h-4 w-4 mr-2" /> Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteWaiter(waiter.id)}
                        disabled={deletingWaiterId === waiter.id}
                      >
                        {deletingWaiterId === waiter.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4 mr-2" />
                        )}
                        Delete
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </Card>

        <Card className="p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <div>
              <h2 className="text-xl font-semibold">Table Management</h2>
              <p className="text-sm text-muted-foreground">
                Create tables, control availability, and review waiter coverage.
              </p>
            </div>
            <div className="flex items-center gap-2 self-start md:self-auto">
              <Button onClick={openCreateTable} className="inline-flex items-center gap-2">
                <Plus className="h-4 w-4" /> Add table
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTableSectionOpen((prev) => !prev)}
                aria-label={tableSectionOpen ? 'Collapse table section' : 'Expand table section'}
              >
                {tableSectionOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {tableSectionOpen && (loadingTables ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, idx) => (
                <Skeleton key={idx} className="h-20 w-full rounded-xl" />
              ))}
            </div>
          ) : sortedTables.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tables yet. Add your first table to get started.</p>
          ) : (
            <div className="space-y-3">
              {sortedTables.map((table) => {
                const assignedWaiters = waitersByTable.get(table.id) || [];
                return (
                  <div
                    key={table.id}
                    className={`border border-border/60 rounded-xl p-4 bg-white flex flex-col gap-4 md:flex-row md:items-center md:justify-between ${
                      table.isActive ? '' : 'opacity-70'
                    }`}
                  >
                    <div className="flex-1 space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-foreground text-base md:text-lg">{table.label}</p>
                        <Badge
                          variant="outline"
                          className={table.isActive ? 'border-green-500 text-green-600' : 'border-dashed text-muted-foreground'}
                        >
                          {table.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <span>
                          {assignedWaiters.length} waiter{assignedWaiters.length === 1 ? '' : 's'} assigned
                        </span>
                        <span>
                          {table.orderCount ?? 0} total order{(table.orderCount ?? 0) === 1 ? '' : 's'}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {assignedWaiters.length ? (
                          assignedWaiters.map((waiter: any) => (
                            <Badge key={waiter.id} variant="secondary">
                              {waiter.displayName}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground">No waiters assigned</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEditTable(table)}>
                        <Pencil className="h-4 w-4 mr-2" /> Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteTable(table.id)}
                        disabled={tableDeletingId === table.id}
                      >
                        {tableDeletingId === table.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4 mr-2" />
                        )}
                        Delete
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </Card>
      </div>

      <Dialog open={editModalOpen} onOpenChange={closeEditModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit waiter</DialogTitle>
          </DialogHeader>
          {activeWaiter ? (
            <div className="space-y-6">
              <div className="grid gap-2">
                <Label htmlFor="waiter-name">Display name</Label>
                <Input
                  id="waiter-name"
                  value={activeWaiter.displayName}
                  onChange={(e) =>
                    setActiveWaiter((prev: any) =>
                      prev ? { ...prev, displayName: e.target.value } : prev
                    )
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label>Assigned tables</Label>
                <ScrollArea className="max-h-56 rounded-lg border">
                  <div className="p-3 space-y-2">
                    {tables.map((table) => {
                      const checked = tableSelection.has(table.id);
                      const disabled = !table.active && !checked;
                      return (
                        <label
                          key={table.id}
                          className={`flex items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2 text-sm ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                        >
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(value) => handleToggleTable(table.id, Boolean(value))}
                              disabled={disabled}
                            />
                            <span className="font-medium text-foreground">Table {table.label}</span>
                          </div>
                          {!table.active ? (
                            <span className="text-xs text-muted-foreground">Inactive</span>
                          ) : null}
                        </label>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => closeEditModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveWaiter} disabled={savingWaiter} className="inline-flex items-center gap-2">
              {savingWaiter && <Loader2 className="h-4 w-4 animate-spin" />}
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addModalOpen} onOpenChange={(open) => {
        setAddModalOpen(open);
        if (!open) {
          setNewWaiter({ email: '', displayName: '', password: '' });
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add waiter</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="new-waiter-email">Email</Label>
              <Input
                id="new-waiter-email"
                type="email"
                value={newWaiter.email}
                onChange={(e) => setNewWaiter((prev) => ({ ...prev, email: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="new-waiter-name">Display name</Label>
              <Input
                id="new-waiter-name"
                value={newWaiter.displayName}
                onChange={(e) => setNewWaiter((prev) => ({ ...prev, displayName: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="new-waiter-password">Password</Label>
              <Input
                id="new-waiter-password"
                type="password"
                value={newWaiter.password}
                onChange={(e) => setNewWaiter((prev) => ({ ...prev, password: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateWaiter}
              disabled={addingWaiter || !newWaiter.email || !newWaiter.password}
              className="inline-flex items-center gap-2"
            >
              {addingWaiter && <Loader2 className="h-4 w-4 animate-spin" />}
              Create waiter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={tableModalOpen}
        onOpenChange={(open) => {
          setTableModalOpen(open);
          if (!open) {
            setTableForm({ id: undefined, label: '', isActive: true });
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{tableForm.id ? 'Edit table' : 'Add table'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="table-label">Label</Label>
              <Input
                id="table-label"
                value={tableForm.label}
                onChange={(e) => setTableForm((prev) => ({ ...prev, label: e.target.value }))}
              />
            </div>
            <div className="flex items-center justify-between gap-4 rounded-lg border border-border/60 px-3 py-2">
              <div>
                <p className="text-sm font-medium text-foreground">Active</p>
                <p className="text-xs text-muted-foreground">
                  Inactive tables stay hidden from the customer menu and waiter assignments.
                </p>
              </div>
              <Switch
                checked={tableForm.isActive}
                onCheckedChange={(value) => setTableForm((prev) => ({ ...prev, isActive: Boolean(value) }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTableModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveTable}
              disabled={savingTable || tableForm.label.trim().length === 0}
              className="inline-flex items-center gap-2"
            >
              {savingTable && <Loader2 className="h-4 w-4 animate-spin" />}
              {tableForm.id ? 'Save changes' : 'Create table'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}




