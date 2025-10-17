import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CartItem } from '../types';

interface CartStore {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  getTotal: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (newItem) =>
        set((state) => {
          const existing = state.items.find(
            (i) => i.item.id === newItem.item.id &&
              JSON.stringify(i.selectedModifiers) === JSON.stringify(newItem.selectedModifiers)
          );
          if (existing) {
            return {
              items: state.items.map((i) =>
                i === existing ? { ...i, quantity: i.quantity + newItem.quantity } : i
              ),
            };
          }
          return { items: [...state.items, newItem] };
        }),
      removeItem: (itemId) =>
        set((state) => ({ items: state.items.filter((i) => i.item.id !== itemId) })),
      updateQuantity: (itemId, quantity) =>
        set((state) => ({
          items: state.items.map((i) => (i.item.id === itemId ? { ...i, quantity } : i)),
        })),
      clearCart: () => set({ items: [] }),
      getTotal: () => {
        const { items } = get();
        return items.reduce((sum, cartItem) => {
          let price = cartItem.item.price;
          Object.values(cartItem.selectedModifiers).forEach((optionId) => {
            cartItem.item.modifiers?.forEach((mod) => {
              const opt = mod.options.find((o) => o.id === optionId);
              if (opt) price += opt.priceDelta;
            });
          });
          return sum + price * cartItem.quantity;
        }, 0);
      },
    }),
    { name: 'cart-storage' }
  )
);
