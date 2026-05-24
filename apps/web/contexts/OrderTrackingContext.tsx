"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useRef,
  useCallback,
} from "react";
import { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase-client";
import { ordersApi, trackingApi } from "@/lib/api";
import { showToast } from "@/lib/toast";
import { Order, TrackingOverview, TrackingRoute } from "@shoplift/types";

interface OrderTrackingContextType {
  // Order tracking state
  activeOrders: Order[];
  trackingData: Record<string, TrackingOverview>;
  routeData: Record<string, TrackingRoute>;
  driverPositions: Record<string, { lat: number; lng: number }>;

  // WebSocket status
  isConnected: boolean;
  connectionError: string | null;

  // Actions
  subscribeToOrder: (orderId: string) => void;
  unsubscribeFromOrder: (orderId: string) => void;
  refreshOrderTracking: (orderId: string) => Promise<void>;
  cancelOrder: (orderId: string) => Promise<void>;

  // Utilities
  isOrderActive: (orderId: string) => boolean;
  getTrackingStatus: (orderId: string) => TrackingOverview | null;
  getDriverPosition: (orderId: string) => { lat: number; lng: number } | null;
}

const OrderTrackingContext = createContext<
  OrderTrackingContextType | undefined
>(undefined);

const ACTIVE_ORDER_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "READY_FOR_PICKUP",
  "OUT_FOR_DELIVERY",
];

export const OrderTrackingProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [trackingData, setTrackingData] = useState<
    Record<string, TrackingOverview>
  >({});
  const [routeData, setRouteData] = useState<Record<string, TrackingRoute>>({});
  const [driverPositions, setDriverPositions] = useState<
    Record<string, { lat: number; lng: number }>
  >({});
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const subscriptionsRef = useRef<Record<string, RealtimeChannel | null>>({});

  const startDriverSimulation = useCallback(
    (orderId: string, route: TrackingRoute) => {
      if (!route.waypoints || route.waypoints.length < 2) return;

      let progress = 0.3; // Start 30% along the route
      const interval = setInterval(() => {
        progress += 0.01;

        if (progress >= 1) {
          clearInterval(interval);
          return;
        }

        const waypoints = route.waypoints!;
        const totalPoints = waypoints.length;
        const currentPointIndex = Math.floor(progress * (totalPoints - 1));
        const localProgress = (progress * (totalPoints - 1)) % 1;

        const currentPoint = waypoints[currentPointIndex];
        const nextPoint =
          waypoints[Math.min(currentPointIndex + 1, totalPoints - 1)];

        if (currentPoint && nextPoint) {
          const lat =
            currentPoint.lat +
            (nextPoint.lat - currentPoint.lat) * localProgress;
          const lng =
            currentPoint.lng +
            (nextPoint.lng - currentPoint.lng) * localProgress;

          setDriverPositions((prev) => ({
            ...prev,
            [orderId]: { lat, lng },
          }));
        }
      }, 3000);

      return () => clearInterval(interval);
    },
    [],
  );

  const handleStatusChange = useCallback((order: Order) => {
    const statusMessages: Record<string, string> = {
      CONFIRMED: "Order confirmed! Restaurant is preparing your food.",
      PREPARING: "Your order is being prepared.",
      READY_FOR_PICKUP: "Your order is ready for pickup!",
      OUT_FOR_DELIVERY: "Your driver is on the way!",
      DELIVERED: "Order delivered! Enjoy your meal.",
      CANCELLED: "Order has been cancelled.",
    };

    const message = statusMessages[order.status];
    if (message) {
      if (order.status === "DELIVERED") {
        showToast.success(message);
      } else if (order.status === "CANCELLED") {
        showToast.error(message);
      } else {
        showToast.success(message);
      }
    }
  }, []);

  const loadTrackingData = useCallback(
    async (orderId: string) => {
      try {
        // Load tracking overview
        const { data: tracking, error: trackingError } =
          await trackingApi.getStatus(orderId);
        if (!trackingError && tracking) {
          setTrackingData((prev) => ({ ...prev, [orderId]: tracking }));
        }

        // Load route data if order is out for delivery
        const order = activeOrders.find((o) => o.id === orderId);
        if (order?.status === "OUT_FOR_DELIVERY") {
          const { data: route, error: routeError } =
            await trackingApi.getRoute(orderId);
          if (!routeError && route) {
            setRouteData((prev) => ({ ...prev, [orderId]: route }));
            // Start driver simulation if route has waypoints
            if (route.waypoints && route.waypoints.length > 0) {
              startDriverSimulation(orderId, route);
            }
          }
        }
      } catch (error) {
        console.error(
          `Failed to load tracking data for order ${orderId}:`,
          error,
        );
      }
    },
    [activeOrders, startDriverSimulation],
  );

  const subscribeToOrder = useCallback(
    (orderId: string) => {
      if (subscriptionsRef.current[orderId]) {
        return; // Already subscribed
      }

      const subscription = supabase
        .channel(`order-tracking-${orderId}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "orders",
            filter: `id=eq.${orderId}`,
          },
          async (payload) => {
            console.log(`Order ${orderId} updated:`, payload.new);

            const updatedOrder = payload.new as Order;

            // Update active orders list
            setActiveOrders((prev) => {
              const existing = prev.find((o) => o.id === orderId);
              if (existing) {
                if (ACTIVE_ORDER_STATUSES.includes(updatedOrder.status)) {
                  return prev.map((o) => (o.id === orderId ? updatedOrder : o));
                } else {
                  // Order is no longer active, remove it
                  return prev.filter((o) => o.id !== orderId);
                }
              } else if (ACTIVE_ORDER_STATUSES.includes(updatedOrder.status)) {
                // New active order
                return [...prev, updatedOrder];
              }
              return prev;
            });

            // Update tracking data when status changes
            await loadTrackingData(orderId);

            // Show toast notification for important status changes
            if (payload.old.status !== updatedOrder.status) {
              handleStatusChange(updatedOrder);
            }
          },
        )
        .on(
          "broadcast",
          {
            event: "driver_location_update",
          },
          (payload) => {
            if (payload.payload?.orderId === orderId) {
              const { lat, lng } = payload.payload;
              setDriverPositions((prev) => ({
                ...prev,
                [orderId]: { lat, lng },
              }));
            }
          },
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            setIsConnected(true);
            setConnectionError(null);
            console.log(`Subscribed to order ${orderId} updates`);
          } else if (status === "CHANNEL_ERROR") {
            setConnectionError(`Failed to connect to order ${orderId} updates`);
            setIsConnected(false);
          }
        });

      subscriptionsRef.current[orderId] = subscription;
    },
    [handleStatusChange, loadTrackingData],
  );

  const unsubscribeFromOrder = useCallback((orderId: string) => {
    const subscription = subscriptionsRef.current[orderId];
    if (subscription) {
      supabase.removeChannel(subscription);
      delete subscriptionsRef.current[orderId];

      // Clean up related data
      setTrackingData((prev) => {
        const newData = { ...prev };
        delete newData[orderId];
        return newData;
      });
      setRouteData((prev) => {
        const newData = { ...prev };
        delete newData[orderId];
        return newData;
      });
      setDriverPositions((prev) => {
        const newData = { ...prev };
        delete newData[orderId];
        return newData;
      });
    }
  }, []);

  const loadActiveOrders = useCallback(async () => {
    try {
      const { data, error } = await ordersApi.history();
      if (!error && data) {
        const active = data.filter((order) =>
          ACTIVE_ORDER_STATUSES.includes(order.status),
        );
        setActiveOrders(active);

        // Subscribe to active orders and load their tracking data
        active.forEach((order) => {
          subscribeToOrder(order.id);
          void loadTrackingData(order.id);
        });
      }
    } catch (error) {
      console.error("Failed to load active orders:", error);
      setConnectionError("Failed to load orders");
    }
  }, [loadTrackingData, subscribeToOrder]);

  useEffect(() => {
    const currentSubscriptions = subscriptionsRef.current;

    void loadActiveOrders();

    return () => {
      // Cleanup all subscriptions
      Object.values(currentSubscriptions).forEach((sub) => {
        if (sub) supabase.removeChannel(sub);
      });
    };
  }, [loadActiveOrders]);

  const refreshOrderTracking = async (orderId: string) => {
    await loadTrackingData(orderId);

    // Refresh order details
    try {
      const { data: order, error } = await ordersApi.get(orderId);
      if (!error && order) {
        setActiveOrders((prev) => {
          const existing = prev.find((o) => o.id === orderId);
          if (existing) {
            return prev.map((o) => (o.id === orderId ? order : o));
          } else if (ACTIVE_ORDER_STATUSES.includes(order.status)) {
            return [...prev, order];
          }
          return prev;
        });
      }
    } catch (error) {
      console.error("Failed to refresh order:", error);
      showToast.error("Failed to refresh order tracking");
    }
  };

  const cancelOrder = async (orderId: string) => {
    try {
      const { error } = await ordersApi.cancel(orderId);
      if (error) {
        showToast.error(error);
        throw error;
      }

      showToast.success("Order cancelled successfully");
      await refreshOrderTracking(orderId);
    } catch (error) {
      console.error("Failed to cancel order:", error);
      throw error;
    }
  };

  const isOrderActive = (orderId: string): boolean => {
    return activeOrders.some((order) => order.id === orderId);
  };

  const getTrackingStatus = (orderId: string): TrackingOverview | null => {
    return trackingData[orderId] || null;
  };

  const getDriverPosition = (
    orderId: string,
  ): { lat: number; lng: number } | null => {
    return driverPositions[orderId] || null;
  };

  const value: OrderTrackingContextType = {
    activeOrders,
    trackingData,
    routeData,
    driverPositions,
    isConnected,
    connectionError,
    subscribeToOrder,
    unsubscribeFromOrder,
    refreshOrderTracking,
    cancelOrder,
    isOrderActive,
    getTrackingStatus,
    getDriverPosition,
  };

  return (
    <OrderTrackingContext.Provider value={value}>
      {children}
    </OrderTrackingContext.Provider>
  );
};

export const useOrderTracking = () => {
  const context = useContext(OrderTrackingContext);
  if (context === undefined) {
    throw new Error(
      "useOrderTracking must be used within an OrderTrackingProvider",
    );
  }
  return context;
};
