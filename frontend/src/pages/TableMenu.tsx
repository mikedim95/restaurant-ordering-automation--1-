import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { MenuItemCard } from "@/components/menu/MenuItemCard";
import { ModifierDialog } from "@/components/menu/ModifierDialog";
import { Cart } from "@/components/menu/Cart";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useCartStore } from "@/store/cartStore";
import { api } from "@/lib/api";
import { mqttService } from "@/lib/mqtt";
import { MenuItem } from "@/types";
import { Bell, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

export default function TableMenu() {
  const { tableId } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { addItem, clearCart } = useCartStore();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [menuData, setMenuData] = useState<{
    categories: Array<{ id: string; title: string }>;
    items: MenuItem[];
    modifiers: any[];
    modifierOptions: any[];
    itemModifiers: any[];
  } | null>(null);
  const [storeName, setStoreName] = useState<string>("Demo Café");
  const [storeSlug, setStoreSlug] = useState<string>("demo-cafe");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [customizeItem, setCustomizeItem] = useState<MenuItem | null>(null);
  const [calling, setCalling] = useState<"idle" | "pending" | "accepted">("idle");

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        setLoading(true);
        const [storeRes, data] = await Promise.all([
          api.getStore() as Promise<any>,
          api.getMenu() as Promise<any>,
        ]);
        if (storeRes?.store?.name) setStoreName(storeRes.store.name);
        if (storeRes?.store?.slug) setStoreSlug(storeRes.store.slug);
        // Normalize categories shape for tabs: keep API order
        const categories = (data as any)?.categories?.map((c: any) => ({ id: c.id, title: c.title })) || [];
        setMenuData({
          categories,
          items: (data as any)?.items || [],
          modifiers: (data as any)?.modifiers || [],
          modifierOptions: [],
          itemModifiers: [],
        });
        setError(null);
      } catch (err) {
        console.error("Failed to fetch menu:", err);
        setError("Failed to load menu. Using offline mode.");
        // Fallback to mock data if API fails
        const { MENU_ITEMS } = await import("@/lib/menuData");
        setMenuData({
          categories: Array.from(new Set(MENU_ITEMS.map((i) => i.category))).map((name, idx) => ({ id: String(idx), title: name })),
          items: MENU_ITEMS,
          modifiers: [],
          modifierOptions: [],
          itemModifiers: [],
        });
      } finally {
        setLoading(false);
      }
    };

    fetchMenu();
  }, []);

  const categories = menuData ? menuData.categories : [];
  const filteredItems = menuData
    ? selectedCategory === "all"
      ? menuData.items
      : menuData.items.filter((i: any) => i.categoryId === selectedCategory || i.category === categories.find(c => c.id === selectedCategory)?.title)
    : [];

  const handleAddItem = (item: MenuItem) => {
    if (item.modifiers && item.modifiers.length > 0) {
      setCustomizeItem(item);
      setCustomizeOpen(true);
      return;
    }
    addItem({ item, quantity: 1, selectedModifiers: {} });
    toast({ title: "Added to cart", description: item.name });
  };

  const handleConfirmModifiers = (selected: Record<string, string>) => {
    if (!customizeItem) return;
    addItem({ item: customizeItem, quantity: 1, selectedModifiers: selected });
    toast({ title: "Added to cart", description: customizeItem.name });
    setCustomizeOpen(false);
    setCustomizeItem(null);
  };

  const handleCheckout = async (note?: string) => {
    if (!tableId || !menuData) return;

    try {
      const cartItems = useCartStore.getState().items;

      const orderData = {
        tableId,
        items: cartItems.map((item) => ({
          itemId: item.item.id,
          quantity: item.quantity,
          modifiers: JSON.stringify(item.selectedModifiers),
        })),
        note: note ?? "",
      };

      const response = (await api.createOrder(orderData)) as any;
      clearCart();
      const orderId = response?.order?.id || response?.orderId;
      // pass tableId so the thanks page can subscribe to the ready topic
      const params = new URLSearchParams({ tableId });
      navigate(`/order/${orderId}/thanks?${params.toString()}`);
    } catch (err) {
      console.error("Failed to create order:", err);
      toast({
        title: "Error",
        description: (err as any)?.message || "Failed to place order. Please try again.",
      });
    }
  };

  useEffect(() => {
    // subscribe for call acknowledgements for this table
    if (!tableId) return;
    let mounted = true;
    (async () => {
      await mqttService.connect();
      mqttService.subscribe(`stores/${storeSlug}/tables/${tableId}/call/accepted`, () => {
        if (!mounted) return;
        setCalling("accepted");
      });
      mqttService.subscribe(`stores/${storeSlug}/tables/${tableId}/call/cleared`, () => {
        if (!mounted) return;
        setCalling("idle");
      });
    })();
    return () => {
      mounted = false;
      mqttService.unsubscribe(`stores/${storeSlug}/tables/${tableId}/call/accepted`);
      mqttService.unsubscribe(`stores/${storeSlug}/tables/${tableId}/call/cleared`);
    };
  }, [storeSlug, tableId]);

  const handleCallWaiter = async () => {
    if (!tableId) return;
    try {
      setCalling("pending");
      await api.callWaiter(tableId);
      toast({
        title: "Waiter called",
        description: "A waiter will be with you shortly",
      });
      // safety re-enable after 45s
      setTimeout(() => setCalling((s) => (s === "pending" ? "idle" : s)), 45000);
    } catch (err: any) {
      const msg = err?.message || '';
      toast({
        title: "Call failed",
        description:
          msg.includes('403') || msg.includes('whitelist')
            ? "Device not allowed by IP whitelist. See ALLOWED_IPS in backend."
            : msg || "Unable to call waiter.",
      });
      setCalling("idle");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-purple-600">{storeName}</h1>
            <p className="text-sm text-gray-500">Table {tableId}</p>
          </div>
          <div className="flex gap-2">
            <button
              disabled={calling !== "idle"}
              onClick={handleCallWaiter}
              className={`relative inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition ${
                calling === "idle" ? "bg-white hover:bg-gray-50" : "bg-blue-50 text-blue-700 border-blue-200"
              } ${calling !== "idle" ? "opacity-80 cursor-not-allowed" : ""}`}
            >
              <span className="relative inline-flex">
                {calling !== "idle" && (
                  <span className="absolute inline-flex h-full w-full rounded-full animate-ping bg-blue-300 opacity-60" />
                )}
                <Bell className="h-4 w-4 relative" />
              </span>
              {calling === "idle" && t("menu.call_waiter")}
              {calling === "pending" && "Calling…"}
              {calling === "accepted" && "Coming…"}
            </button>
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex gap-2 mb-8 overflow-x-hidden pb-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-24 rounded-full" />
            ))}
          </div>
        ) : (
          <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
            <Button
              key="all"
              variant={selectedCategory === 'all' ? 'default' : 'outline'}
              onClick={() => setSelectedCategory('all')}
              className="shrink-0"
            >
              All
            </Button>
            {categories.map((cat) => (
              <Button
                key={cat.id}
                variant={selectedCategory === cat.id ? "default" : "outline"}
                onClick={() => setSelectedCategory(cat.id)}
                className="shrink-0"
              >
                {cat.title}
              </Button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl shadow-md overflow-hidden">
                <Skeleton className="w-full aspect-square" />
                <div className="p-4 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <div className="flex items-center justify-between pt-2">
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-9 w-24 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-500 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </div>
        ) : (
          <>
            {selectedCategory === 'all' ? (
              <div className="space-y-8">
                {categories.map((cat) => {
                  const catItems = menuData!.items.filter((i: any) => i.categoryId === cat.id || i.category === cat.title);
                  if (catItems.length === 0) return null;
                  return (
                    <section key={cat.id}>
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-lg font-semibold text-gray-800">{cat.title}</h3>
                        <div className="h-px bg-gray-200 flex-1" />
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {catItems.map((item) => (
                          <MenuItemCard key={item.id} item={item} onAdd={handleAddItem} />
                        ))}
                      </div>
                    </section>
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {filteredItems.map((item) => (
                  <MenuItemCard key={item.id} item={item} onAdd={handleAddItem} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <Cart onCheckout={handleCheckout} />
      <ModifierDialog
        open={customizeOpen}
        item={customizeItem}
        onClose={() => { setCustomizeOpen(false); setCustomizeItem(null); }}
        onConfirm={handleConfirmModifiers}
      />
    </div>
  );
}
