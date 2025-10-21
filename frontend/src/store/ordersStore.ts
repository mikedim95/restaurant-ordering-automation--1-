import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Order, OrderStatus } from '@/types';

interface OrdersStore {
  orders: Order[];
  setOrders: (orders: Order[]) => void;
  upsert: (order: Order) => void;
  updateStatus: (orderId: string, status: OrderStatus) => void;
  clear: () => void;
}

export const useOrdersStore = create<OrdersStore>()(
  persist(
    (set, get) => ({
      orders: [],
      setOrders: (orders) => set({ orders }),
      upsert: (order) =>
        set((state) => {
          const idx = state.orders.findIndex((o) => o.id === order.id);
          if (idx >= 0) {
            const copy = state.orders.slice();
            copy[idx] = { ...copy[idx], ...order };
            return { orders: copy };
          }
          return { orders: [order, ...state.orders].slice(0, 200) };
        }),
      updateStatus: (orderId, status) =>
        set((state) => ({
          orders: state.orders.map((o) => (o.id === orderId ? { ...o, status } : o)),
        })),
      clear: () => set({ orders: [] }),
    }),
    { name: 'orders-storage' }
  )
);

