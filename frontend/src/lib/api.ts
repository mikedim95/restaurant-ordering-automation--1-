// API service with error handling to prevent JSON parse errors
const API_BASE = import.meta.env.VITE_API_URL || "/api";

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
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
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
      throw new ApiError(response.status, error.message || "Request failed");
    }

    return response.json();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    // Network or parse error - return mock data for demo
    throw new ApiError(0, "Network error - using offline mode");
  }
}

export const api = {
  getMenu: () => fetchApi("/menu"),
  createOrder: (data: any) =>
    fetchApi("/orders", { method: "POST", body: JSON.stringify(data) }),
  callWaiter: (tableId: string) =>
    fetchApi("/call-waiter", {
      method: "POST",
      body: JSON.stringify({ tableId }),
    }),
  getOrders: (params?: { status?: string }) => {
    const query = params?.status ? `?status=${params.status}` : "";
    return fetchApi(`/orders${query}`);
  },
  updateOrderStatus: (orderId: string, status: string) =>
    fetchApi(`/orders/${orderId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
};
