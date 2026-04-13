import {
  ApiResponse,
  Order,
  Restaurant,
  MenuItem,
  OrderStatus,
  SupportTicket,
  TicketMessage,
  AdminOverviewResponse,
  OnboardRestaurantBody,
  RefundBody,
  TrackingOverview,
  TrackingRoute,
  CreateTicketBody,
} from "@shoplift/types";

import { supabase } from "@/lib/supabase-client";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

type ApiResult<T> = { data: T | null; error: string | null };

const getSupabaseToken = async (): Promise<string | null> => {
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  } catch {
    return null;
  }
};

async function fetcher<T>(
  endpoint: string,
  options: RequestInit = {},
  token?: string | null,
): Promise<ApiResult<T>> {
  const url = `${BASE_URL}${endpoint}`;

  // Special handling for logout - don't send token
  const shouldSendToken = endpoint !== "/auth/logout";

  // Auto-fetch token from Supabase session if not explicitly provided
  const resolvedToken =
    shouldSendToken && token !== undefined
      ? token
      : shouldSendToken
        ? await getSupabaseToken()
        : null;

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  // Only set Content-Type for requests with bodies
  if (options.body) {
    headers["Content-Type"] = "application/json";
  }

  // Only set Authorization if we have a token and should send it
  if (resolvedToken) {
    headers["Authorization"] = `Bearer ${resolvedToken}`;
  }

  const defaultOptions: RequestInit = {
    ...options,
    credentials: "include",
    headers,
  };

  try {
    const response = await fetch(url, defaultOptions);

    if (response.status === 401) {
      return { data: null, error: "Unauthorized" };
    }

    const result: ApiResponse<T> = await response.json();

    if (!response.ok || !result.success) {
      let errorMessage = "An error occurred";
      if (typeof result.error === "string") {
        errorMessage = result.error;
      } else if (
        result.error &&
        typeof result.error === "object" &&
        "message" in result.error
      ) {
        errorMessage = (result.error as any).message;
      }
      return { data: null, error: errorMessage };
    }

    return { data: (result.data as T) ?? null, error: null };
  } catch (error: any) {
    return { data: null, error: error.message || "Network error" };
  }
}

// --- Auth ---

export const authApi = {
  register: (body: any) =>
    fetcher<any>("/auth/register", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  login: (body: any) =>
    fetcher<{ uid: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  otpSend: (body: { phone: string }) =>
    fetcher<any>("/auth/otp/send", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  otpVerify: (body: { phone: string; otp: string }) =>
    fetcher<any>("/auth/otp/verify", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  refresh: (body: { refreshToken: string }) =>
    fetcher<any>("/auth/refresh", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  logout: () => fetcher<any>("/auth/logout", { method: "DELETE" }, null), //avoid sending auth headers after logout so backend stops returning 401 errors
  me: (token?: string | null) =>
    fetcher<{
      uid: string;
      email: string;
      displayName: string;
      username: string | null;
      role: string;
      restaurantId: string | null;
    }>("/auth/me", {}, token),
  updateUsername: (username: string) =>
    fetcher<any>("/auth/profile/username", {
      method: "PUT",
      body: JSON.stringify({ username }),
    }),
};

// --- Restaurants ---

export const restaurantsApi = {
  list: (params?: string) =>
    fetcher<Restaurant[]>(`/restaurants${params ? `?${params}` : ""}`),
  get: (id: string) => fetcher<Restaurant>(`/restaurants/${id}`),
  getMenu: (id: string) => fetcher<MenuItem[]>(`/restaurants/${id}/menu`),
};

// --- Orders ---

export const ordersApi = {
  create: (body: any) =>
    fetcher<Order>("/orders", { method: "POST", body: JSON.stringify(body) }),
  get: (id: string) => fetcher<Order>(`/orders/${id}`),
  updateStatus: (id: string, status: OrderStatus) =>
    fetcher<Order>(`/orders/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    }),
  cancel: (id: string) =>
    fetcher<any>(`/orders/${id}/cancel`, { method: "POST" }),
  history: () => fetcher<Order[]>("/orders/history"),
  getReceiptUrl: (id: string) => `${BASE_URL}/orders/${id}/receipt`,
};

// --- Promos ---

export const promosApi = {
  validate: (body: {
    code: string;
    restaurantId: string;
    cartTotal: number;
    cartItemIds: string[];
  }) =>
    fetcher<any>("/promos/validate", {
      method: "POST",
      body: JSON.stringify(body),
    }),
};

// --- Addresses ---

export const addressesApi = {
  list: () => fetcher<any[]>("/addresses"),
  create: (body: {
    label: string;
    street: string;
    district: string;
    city: string;
  }) =>
    fetcher<any>("/addresses", {
      method: "POST",
      body: JSON.stringify(body),
    }),
};

// --- Payments ---

export const paymentsApi = {
  initiate: (body: any) =>
    fetcher<{ paymentUrl: string; paymentId: string }>("/payments/initiate", {
      method: "POST",
      body: JSON.stringify(body),
    }),
};

// --- Tracking ---

export const trackingApi = {
  getStatus: (orderId: string) =>
    fetcher<TrackingOverview>(`/tracking/${orderId}`),
  getRoute: (orderId: string) =>
    fetcher<TrackingRoute>(`/tracking/${orderId}/route`),
};

// --- Support ---

export const supportApi = {
  createTicket: (body: CreateTicketBody) =>
    fetcher<SupportTicket>("/support/tickets", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getTicket: (id: string) => fetcher<SupportTicket>(`/support/tickets/${id}`),
  sendMessage: (id: string, message: string) =>
    fetcher<TicketMessage>(`/support/tickets/${id}/message`, {
      method: "POST",
      body: JSON.stringify({ message }),
    }),
};

// --- Restaurant Admin ---

export const restaurantAdminApi = {
  getOrders: () => fetcher<Order[]>("/admin/restaurant/orders"),
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
  getAnalytics: () => fetcher<any>("/admin/restaurant/analytics"),
  getPayouts: () => fetcher<any>("/admin/restaurant/payouts"),
  createPromo: (body: any) =>
    fetcher<any>("/admin/restaurant/promos", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getDrivers: () => fetcher<any[]>("/admin/restaurant/drivers"),
};

// --- Super Admin ---

export const superAdminApi = {
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
  getPayouts: () => fetcher<any[]>("/admin/super/payouts"),
  approvePayout: (id: string) =>
    fetcher<any>(`/admin/super/payouts/${id}/approve`, { method: "POST" }),
  getSupport: () => fetcher<SupportTicket[]>("/admin/super/support"),
  getUser: (id: string) => fetcher<any>(`/admin/super/users/${id}`),
  issueRefund: (body: RefundBody) =>
    fetcher<any>("/admin/super/refunds", {
      method: "POST",
      body: JSON.stringify(body),
    }),
};

// --- Misc ---

export const miscApi = {
  health: () => fetcher<any>("/health"),
};
