import {
  ApiResponse,
  Order,
  Restaurant,
  MenuItem,
  OrderStatus,
  SupportTicket,
  AdminOverviewResponse,
  OnboardRestaurantBody,
  RefundBody,
} from "@shoplift/types";
import { supabaseAdmin } from "./supabase-admin";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

type ApiResult<T> = { data: T | null; error: string | null };

let currentToken: string | null = null;
supabaseAdmin.auth.onAuthStateChange((event, session) => {
  currentToken = session?.access_token || null;
});

async function fetcher<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<ApiResult<T>> {
  if (!currentToken) {
    const { data: session } = await supabaseAdmin.auth.getSession();
    currentToken = session?.session?.access_token || null;
  }
  const token = currentToken;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const url = `${BASE_URL}${endpoint}`;
  try {
    const response = await fetch(url, {
      ...options,
      headers,
      credentials: "include",
    });

    if (response.status === 401) {
      console.error(`fetcher ${endpoint} 401 Unauthorized`);
      return { data: null, error: "Unauthorized" };
    }

    const result: ApiResponse<T> = await response.json();

    if (!response.ok || !result.success) {
      console.error(`fetcher ${endpoint} error:`, result.error, result);
      return { data: null, error: result.error || "An error occurred" };
    }

    return { data: result.data as T, error: null };
  } catch (error: any) {
    console.error(`fetcher ${endpoint} network error:`, error);
    return { data: null, error: error.message || "Network error" };
  }
}

export const adminApi = {
  // Super Admin
  getOverview: () => fetcher<AdminOverviewResponse>("/admin/super/overview"),
  getRestaurants: () => fetcher<Restaurant[]>("/admin/super/restaurants"),
  onboardRestaurant: (body: OnboardRestaurantBody) =>
    fetcher<Restaurant>("/admin/super/restaurants", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateRestaurant: (id: string, body: any) =>
    fetcher<Restaurant>(`/admin/super/restaurants/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  getUser: (id: string) => fetcher<any>(`/admin/super/users/${id}`),
  issueRefund: (body: RefundBody) =>
    fetcher<any>("/admin/super/refunds", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getAuditLog: (params?: string) =>
    fetcher<any[]>(`/admin/super/audit${params ? `?${params}` : ""}`),
  getInventory: (params?: string) =>
    fetcher<any[]>(`/admin/super/inventory${params ? `?${params}` : ""}`),
  assignRestaurantAdmin: (restaurantId: string, email: string) =>
    fetcher<any>(`/admin/super/restaurants/${restaurantId}`, {
      method: "PUT",
      body: JSON.stringify({ restaurant_admin_email: email }),
    }),

  // Restaurant Admin
  getOrders: () => fetcher<Order[]>("/admin/restaurant/orders"),
  updateOrderStatus: (id: string, status: OrderStatus) =>
    fetcher<Order>(`/orders/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    }),
  getMenu: () => fetcher<MenuItem[]>("/admin/restaurant/menu"),
  createMenuItem: (body: any) =>
    fetcher<MenuItem>("/admin/restaurant/menu/items", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateMenuItem: (id: string, body: any) =>
    fetcher<MenuItem>(`/admin/restaurant/menu/items/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  deleteMenuItem: (id: string) =>
    fetcher<any>(`/admin/restaurant/menu/items/${id}`, { method: "DELETE" }),
  getAnalytics: (period: string) =>
    fetcher<any>(`/admin/restaurant/analytics?period=${period}`),
  rejectOrder: (id: string, reason?: string) =>
    fetcher<Order>(`/orders/${id}/reject`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),
  updateTelegramChatId: (telegramChatId: string) =>
    fetcher<any>("/auth/profile/telegram", {
      method: "PUT",
      body: JSON.stringify({ telegramChatId }),
    }),
};
