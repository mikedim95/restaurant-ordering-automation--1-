import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { MenuItemCard } from "@/components/menu/MenuItemCard";
import { Cart } from "@/components/menu/Cart";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useCartStore } from "@/store/cartStore";
import { api } from "@/lib/api";
import { MenuItem } from "@/types";
import { Bell, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function TableMenu() {
  const { tableId } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { addItem, clearCart } = useCartStore();
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [menuData, setMenuData] = useState<{
    categories: any[];
    items: MenuItem[];
    modifiers: any[];
    modifierOptions: any[];
    itemModifiers: any[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        setLoading(true);
        const data = await api.getMenu();
        setMenuData(data as NonNullable<typeof menuData>);
        setError(null);
      } catch (err) {
        console.error("Failed to fetch menu:", err);
        setError("Failed to load menu. Using offline mode.");
        // Fallback to mock data if API fails
        const { MENU_ITEMS } = await import("@/lib/menuData");
        setMenuData({
          categories: [],
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

  const categories = menuData
    ? ["All", ...Array.from(new Set(menuData.items.map((i) => i.category)))]
    : ["All"];
  const filteredItems = menuData
    ? selectedCategory === "All"
      ? menuData.items
      : menuData.items.filter((i) => i.category === selectedCategory)
    : [];

  const handleAddItem = (item: MenuItem) => {
    addItem({ item, quantity: 1, selectedModifiers: {} });
    toast({ title: "Added to cart", description: item.name });
  };

  const handleCheckout = async () => {
    if (!tableId || !menuData) return;

    try {
      const cartItems = useCartStore.getState().items;
      const totalCents = Math.round(useCartStore.getState().getTotal() * 100);

      const orderData = {
        tableId,
        items: cartItems.map((item) => ({
          itemId: item.item.id,
          quantity: item.quantity,
          priceCents: Math.round(item.item.price * 100),
          modifiers: JSON.stringify(item.selectedModifiers),
        })),
        totalCents,
        note: "",
      };

      const response = (await api.createOrder(orderData)) as {
        orderId: string;
      };
      clearCart();
      navigate(`/order/${response.orderId}/thanks`);
    } catch (err) {
      console.error("Failed to create order:", err);
      toast({
        title: "Error",
        description: "Failed to place order. Please try again.",
      });
    }
  };

  const handleCallWaiter = () => {
    toast({
      title: "Waiter called",
      description: "A waiter will be with you shortly",
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-purple-600">Demo Café</h1>
            <p className="text-sm text-gray-500">Table {tableId}</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCallWaiter}
              className="gap-2"
            >
              <Bell className="h-4 w-4" />
              {t("menu.call_waiter")}
            </Button>
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {categories.map((cat) => (
            <Button
              key={cat}
              variant={selectedCategory === cat ? "default" : "outline"}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </Button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-500 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map((item) => (
              <MenuItemCard key={item.id} item={item} onAdd={handleAddItem} />
            ))}
          </div>
        )}
      </div>

      <Cart onCheckout={handleCheckout} />
    </div>
  );
}
