export type OrderStatus = 'PLACED' | 'PREPARING' | 'READY' | 'SERVED' | 'CANCELLED';
export type UserRole = 'waiter' | 'manager';

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  available: boolean;
  modifiers?: Modifier[];
}

export interface Modifier {
  id: string;
  name: string;
  options: ModifierOption[];
  required?: boolean;
  minSelect?: number;
  maxSelect?: number | null;
}

export interface ModifierOption {
  id: string;
  label: string;
  priceDelta: number;
}

export interface CartItem {
  item: MenuItem;
  quantity: number;
  selectedModifiers: { [modifierId: string]: string };
}

export interface Order {
  id: string;
  tableId: string;
  tableLabel: string;
  items: CartItem[];
  total: number;
  status: OrderStatus;
  createdAt: string;
  note?: string;
}

export interface User {
  id: string;
  email: string;
  role: UserRole;
  displayName: string;
}

export interface Table {
  id: string;
  label: string;
  active: boolean;
}
