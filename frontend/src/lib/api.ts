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
        "Content-Type": "application/json",
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
  getOrders: (params?: { status?: string }) => {
    const query = params?.status ? `?status=${params.status}` : "";
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
};
