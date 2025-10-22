// API service with auth + robust JSON/error handling
import { useAuthStore } from "@/store/authStore";

const ENV_API: string | undefined = (import.meta as any).env?.VITE_API_URL;
const API_BASE = (() => {
  // If a non-localhost API is explicitly provided, use it
  if (ENV_API && !/localhost/i.test(ENV_API)) return ENV_API;
  // Otherwise, derive from current host so phones on LAN can reach the backend
  if (typeof window !== "undefined") {
    const host = window.location.hostname; // e.g., 192.168.x.x
    return `http://${host}:8787`;
  }
  return "http://localhost:8787";
})();

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  try {
    const token = useAuthStore.getState().token;
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        ...(options?.body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options?.headers,
      },
    });

    // Check if response is JSON
    const contentType = response.headers.get("content-type");
    if (!contentType?.includes("application/json")) {
      throw new ApiError(response.status, "Server returned non-JSON response");
    }

    if (!response.ok) {
      const error = await response.json();
      const message = error.error || error.message || "Request failed";
      throw new ApiError(response.status, message);
    }

    return response.json();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(0, "Network error or invalid response");
  }
}

export const api = {
  // Store & tables
  getStore: () => fetchApi("/store"),
  getTables: () => fetchApi("/tables"),

  // Auth
  signIn: (email: string, password: string) =>
    fetchApi<{ accessToken: string; user: any }>("/auth/signin", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  // Menu & orders (public device endpoints for create + call waiter)
  getMenu: () => fetchApi("/menu"),
  createOrder: (data: any) =>
    fetchApi("/orders", { method: "POST", body: JSON.stringify(data) }),
  callWaiter: (tableId: string) =>
    fetchApi("/call-waiter", {
      method: "POST",
      body: JSON.stringify({ tableId }),
    }),
  // Authenticated orders API
  getOrders: (params?: { status?: string; take?: number }) => {
    const q: string[] = [];
    if (params?.status) q.push(`status=${encodeURIComponent(params.status)}`);
    if (params?.take) q.push(`take=${params.take}`);
    const query = q.length ? `?${q.join('&')}` : "";
    return fetchApi(`/orders${query}`);
  },
  getOrder: (orderId: string) => fetchApi(`/orders/${orderId}`),
  updateOrderStatus: (orderId: string, status: string) =>
    fetchApi(`/orders/${orderId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  // Manager: waiter-table assignments
  getWaiterTables: () => fetchApi("/waiter-tables"),
  assignWaiterTable: (waiterId: string, tableId: string) =>
    fetchApi("/waiter-tables", {
      method: "POST",
      body: JSON.stringify({ waiterId, tableId }),
    }),
  removeWaiterTable: (waiterId: string, tableId: string) =>
    fetchApi("/waiter-tables", {
      method: "DELETE",
      body: JSON.stringify({ waiterId, tableId }),
    }),

  // Manager: waiters CRUD
  listWaiters: () => fetchApi("/manager/waiters"),
  createWaiter: (email: string, password: string, displayName: string) =>
    fetchApi("/manager/waiters", { method: "POST", body: JSON.stringify({ email, password, displayName }) }),
  updateWaiter: (id: string, data: Partial<{ email: string; password: string; displayName: string }>) =>
    fetchApi(`/manager/waiters/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteWaiter: (id: string) => fetchApi(`/manager/waiters/${id}`, { method: "DELETE" }),

  // Manager: items CRUD
  listItems: () => fetchApi("/manager/items"),
  createItem: (data: any) => fetchApi("/manager/items", { method: "POST", body: JSON.stringify(data) }),
  updateItem: (id: string, data: any) => fetchApi(`/manager/items/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteItem: (id: string) => fetchApi(`/manager/items/${id}`, { method: "DELETE" }),

  // Manager: modifiers CRUD
  listModifiers: () => fetchApi("/manager/modifiers"),
  createModifier: (data: any) => fetchApi("/manager/modifiers", { method: "POST", body: JSON.stringify(data) }),
  updateModifier: (id: string, data: any) => fetchApi(`/manager/modifiers/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteModifier: (id: string) => fetchApi(`/manager/modifiers/${id}`, { method: "DELETE" }),
  createModifierOption: (data: any) => fetchApi("/manager/modifier-options", { method: "POST", body: JSON.stringify(data) }),
  updateModifierOption: (id: string, data: any) => fetchApi(`/manager/modifier-options/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteModifierOption: (id: string) => fetchApi(`/manager/modifier-options/${id}`, { method: "DELETE" }),
  linkItemModifier: (itemId: string, modifierId: string, isRequired: boolean) =>
    fetchApi("/manager/item-modifiers", { method: "POST", body: JSON.stringify({ itemId, modifierId, isRequired }) }),
  unlinkItemModifier: (itemId: string, modifierId: string) =>
    fetchApi("/manager/item-modifiers", { method: "DELETE", body: JSON.stringify({ itemId, modifierId }) }),

  // Manager: orders admin
  managerDeleteOrder: (orderId: string) => fetchApi(`/manager/orders/${orderId}`, { method: 'DELETE' }),
  managerCancelOrder: (orderId: string) => fetchApi(`/manager/orders/${orderId}/cancel`, { method: 'PATCH' }),

  // Manager: categories
  listCategories: () => fetchApi('/manager/categories'),
  createCategory: (title: string, sortOrder?: number) => fetchApi('/manager/categories', { method: 'POST', body: JSON.stringify({ title, sortOrder }) }),
  updateCategory: (id: string, data: any) => fetchApi(`/manager/categories/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteCategory: (id: string) => fetchApi(`/manager/categories/${id}`, { method: 'DELETE' }),
};
