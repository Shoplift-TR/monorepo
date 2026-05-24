import { useEffect, useState } from "react";
import { useOrderTracking as useOrderTrackingContext } from "@/contexts/OrderTrackingContext";
import { Order, OrderStatus } from "@shoplift/types";

export interface UseOrderTrackingResult {
  order: Order | null;
  isLoading: boolean;
  isRealTime: boolean;
  trackingData: Record<string, unknown> | null;
  driverPosition: { lat: number; lng: number } | null;
  estimatedDeliveryTime: string | null;
  progressPercentage: number;
  canCancel: boolean;
  nextStatus: OrderStatus | null;
  refreshTracking: () => Promise<void>;
  cancelOrder: () => Promise<void>;
}

const STATUS_FLOW: OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "READY_FOR_PICKUP",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
];

const CANCELLABLE_STATUSES = ["PENDING"];

export const useOrderTracking = (orderId: string): UseOrderTrackingResult => {
  const {
    activeOrders,
    trackingData,
    driverPositions,
    isConnected,
    subscribeToOrder,
    unsubscribeFromOrder,
    refreshOrderTracking,
    cancelOrder: cancelOrderAction,
    isOrderActive,
  } = useOrderTrackingContext();

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Subscribe to order updates
    subscribeToOrder(orderId);

    // Set loading to false after a short delay to allow initial data to load
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    return () => {
      clearTimeout(timer);
      unsubscribeFromOrder(orderId);
    };
  }, [orderId, subscribeToOrder, unsubscribeFromOrder]);

  const order = activeOrders.find((o) => o.id === orderId) || null;
  const orderTrackingData = (trackingData as Record<string, unknown>)[
    orderId
  ] as Record<string, unknown> | null;
  const driverPos = driverPositions[orderId] || null;

  // Calculate progress percentage
  const progressPercentage = order
    ? (STATUS_FLOW.indexOf(order.status) / (STATUS_FLOW.length - 1)) * 100
    : 0;

  // Get next status
  const nextStatus = order
    ? STATUS_FLOW[STATUS_FLOW.indexOf(order.status) + 1] || null
    : null;

  // Estimate delivery time
  const estimatedDeliveryTime =
    order?.estimatedDeliveryTime ||
    (orderTrackingData
      ? (orderTrackingData["estimatedDeliveryTime"] as string)
      : null) ||
    null;

  return {
    order,
    isLoading,
    isRealTime: isConnected && isOrderActive(orderId),
    trackingData: orderTrackingData,
    driverPosition: driverPos,
    estimatedDeliveryTime,
    progressPercentage,
    canCancel: order ? CANCELLABLE_STATUSES.includes(order.status) : false,
    nextStatus,
    refreshTracking: () => refreshOrderTracking(orderId),
    cancelOrder: () => cancelOrderAction(orderId),
  };
};
