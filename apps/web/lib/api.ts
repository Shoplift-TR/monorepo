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

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

type ApiResult<T> = { data: T | null; error: string | null };

async function fetcher<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<ApiResult<T>> {
  const url = `${BASE_URL}${endpoint}`;
  const defaultOptions: RequestInit = {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, defaultOptions);

    if (response.status === 401) {
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
      return { data: null, error: "Unauthorized" };
    }

    const result: ApiResponse<T> = await response.json();

    if (!response.ok || !result.success) {
      return { data: null, error: result.error || "An error occurred" };
    }

    return { data: result.data, error: null };
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
  logout: () => fetcher<any>("/auth/logout", { method: "DELETE" }),
  me: () =>
    fetcher<{
      uid: string;
      email: string;
      displayName: string;
      role: string;
      restaurantId: string | null;
    }>("/auth/me"),
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
