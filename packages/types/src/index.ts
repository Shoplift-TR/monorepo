// Order status
export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PREPARING"
  | "READY_FOR_PICKUP"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED";

// Bilingual string — every user-facing label uses this
export interface BilingualString {
  tr: string;
  en: string;
}

export interface Address {
  line1: string;
  line2?: string;
  city: string;
  coordinates: {
    lat: number;
    lng: number;
  };
}

export interface OrderItem {
  itemId: string;
  name: BilingualString;
  quantity: number;
  unitPrice: number;
  modifiers: {
    name: BilingualString;
    price: number;
  }[];
  subtotal: number;
}

export interface Order {
  id: string;
  customerId: string;
  restaurantId: string;
  driverId: string | null;
  items: OrderItem[];
  status: OrderStatus;
  paymentMethod: "card" | "cash";
  paymentGateway: "iyzico" | "flutterwave" | null;
  paymentIntentId: string | null;
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  promoCode: string | null;
  deliveryAddress: Address;
  estimatedDeliveryTime: string | null;
  notes: string | null;
  createdAt: string;
  confirmedAt: string | null;
  deliveredAt: string | null;
  customerName?: string;
  restaurantName?: string;
}

export interface Restaurant {
  id: string;
  name: BilingualString;
  description: BilingualString;
  logo: string;
  address: string;
  location: { lat: number; lng: number };
  operatingHours: Record<string, { open: string; close: string }>;
  cuisineTags: string[];
  isActive: boolean;
  commissionRate: number;
  rating: number;
  totalOrders: number;
}

export interface MenuItem {
  id: string;
  restaurantId: string;
  name: BilingualString;
  description: BilingualString;
  price: number;
  category: string;
  imageUrl: string;
  isAvailable: boolean;
  modifiers: {
    id: string;
    name: BilingualString;
    options: { name: BilingualString; price: number }[];
    required: boolean;
    maxSelections: number;
  }[];
  displayOrder: number;
}

export interface User {
  uid: string;
  email: string;
  phone: string;
  displayName: string;
  savedAddresses: Address[];
  preferredLanguage: "tr" | "en";
  createdAt: string;
}

export interface Driver {
  id: string;
  restaurantId: string;
  name: string;
  phone: string;
  isOnline: boolean;
  activeOrderId: string | null;
}

export type PromoType =
  | "flat"
  | "percent"
  | "freeDelivery"
  | "bogo"
  | "firstOrder";

export interface Promo {
  id: string;
  code: string;
  type: PromoType;
  value: number;
  maxDiscount: number | null;
  minOrderValue: number | null;
  expiresAt: string;
  usageLimit: number;
  usedCount: number;
  perUserLimit: number;
  restaurantId: string | null;
  isActive: boolean;
}

export interface SupportTicket {
  id: string;
  customerId: string;
  restaurantId: string | null;
  orderId: string | null;
  issueType: "wrong_item" | "late_delivery" | "payment" | "other";
  status:
    | "open"
    | "auto_resolved"
    | "pending_human"
    | "ai_responded"
    | "resolved"
    | "escalated";
  supabaseConversationId: string;
  createdAt: string;
  resolvedAt: string | null;
}

// API response wrapper — all API responses use this shape
export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

export interface AdminOverviewResponse {
  active_restaurants: number;
  total_delivered_orders: number;
  platform_gmv: number;
  recent_orders?: Order[];
}

export interface OnboardRestaurantBody {
  name: BilingualString;
  description: BilingualString;
  owner_email: string;
  cuisine_tags: string[];
  commission_rate: number;
  maintenance_fee: number;
  operating_hours: { open: string; close: string };
  location: { lat: number; lng: number };
  address: string;
}

export interface RefundBody {
  order_id: string;
  reason: string;
}

export interface TrackingOverview {
  orderId: string;
  status: string;
  estimatedDeliveryTime: string | null;
  driverId: string | null;
  restaurantName: string | null;
  deliveryAddressSnapshot: object;
  createdAt: string;
  confirmedAt: string | null;
  deliveredAt: string | null;
}

export interface TrackingRoute {
  waypoints: { lat: number; lng: number; label?: string }[] | null;
  totalPoints?: number;
  message?: string;
}

export interface TicketMessage {
  id: string;
  ticketId: string;
  senderId: string;
  senderRole: "customer" | "restaurant_admin" | "super_admin" | "ai";
  body: string;
  createdAt: string;
}

export interface CreateTicketBody {
  orderId?: string;
  restaurantId?: string;
  issueType: "wrong_item" | "late_delivery" | "payment" | "other";
  message: string;
}

export interface UpdateTicketStatusBody {
  status:
    | "open"
    | "auto_resolved"
    | "pending_human"
    | "ai_responded"
    | "resolved"
    | "escalated";
}
