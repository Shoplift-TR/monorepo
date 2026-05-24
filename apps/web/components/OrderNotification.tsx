"use client";

import { useEffect, useState, useRef } from "react";
import { useOrderTracking } from "@/contexts/OrderTrackingContext";
import { X, CheckCircle, Clock, Package, Bike, Home } from "lucide-react";

interface OrderNotificationProps {
  orderId: string;
  onClose?: () => void;
}

const NOTIFICATION_CONFIG = {
  CONFIRMED: {
    icon: CheckCircle,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    title: "Order Confirmed",
    message: "Restaurant has confirmed your order!",
  },
  PREPARING: {
    icon: Package,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
    title: "Preparing Your Order",
    message: "The restaurant is preparing your food.",
  },
  READY_FOR_PICKUP: {
    icon: Clock,
    color: "text-orange-600",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
    title: "Ready for Pickup",
    message: "Your order is ready and waiting for pickup!",
  },
  OUT_FOR_DELIVERY: {
    icon: Bike,
    color: "text-cyan-600",
    bgColor: "bg-cyan-50",
    borderColor: "border-cyan-200",
    title: "On the Way!",
    message: "Your driver is heading to your location.",
  },
  DELIVERED: {
    icon: Home,
    color: "text-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    title: "Order Delivered!",
    message: "Enjoy your meal!",
  },
};

export default function OrderNotification({
  orderId,
  onClose,
}: OrderNotificationProps) {
  const { trackingData, isOrderActive } = useOrderTracking();
  const [isVisible, setIsVisible] = useState(false);
  const lastStatusRef = useRef<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const currentTrackingData = trackingData[orderId];
  const currentStatus = currentTrackingData?.status;

  // Reset visibility based on conditions
  useEffect(() => {
    if (!currentStatus || !isOrderActive(orderId)) {
      // Defer state updates to avoid synchronous setState inside effect
      setTimeout(() => setIsVisible(false), 0);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [currentStatus, isOrderActive, orderId]);

  // Handle status changes
  useEffect(() => {
    if (!currentStatus || !isOrderActive(orderId)) {
      return;
    }

    // Show notification for status changes
    if (
      currentStatus !== lastStatusRef.current &&
      lastStatusRef.current !== null
    ) {
      const config =
        NOTIFICATION_CONFIG[currentStatus as keyof typeof NOTIFICATION_CONFIG];
      if (config) {
        // Defer showing notification to avoid cascading renders
        setTimeout(() => setIsVisible(true), 0);

        // Auto-hide after 5 seconds
        if (timerRef.current) {
          clearTimeout(timerRef.current);
        }
        timerRef.current = setTimeout(() => {
          setIsVisible(false);
          timerRef.current = null;
        }, 5000);
      }
    }

    lastStatusRef.current = currentStatus;
  }, [currentStatus, orderId, isOrderActive]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  if (
    !isVisible ||
    !currentStatus ||
    !NOTIFICATION_CONFIG[currentStatus as keyof typeof NOTIFICATION_CONFIG]
  ) {
    return null;
  }

  const config =
    NOTIFICATION_CONFIG[currentStatus as keyof typeof NOTIFICATION_CONFIG];
  const Icon = config.icon;

  return (
    <div
      className={`fixed top-20 right-4 z-50 max-w-sm animate-in slide-in-from-right duration-300`}
    >
      <div
        className={`${config.bgColor} ${config.borderColor} border rounded-lg shadow-lg p-4`}
      >
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-full ${config.bgColor}`}>
            <Icon className={`w-5 h-5 ${config.color}`} />
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 text-sm">
              {config.title}
            </p>
            <p className="text-gray-600 text-sm mt-1">{config.message}</p>
            <button
              onClick={() =>
                window.open(
                  `/${document.documentElement.lang}/orders/${orderId}`,
                  "_blank",
                )
              }
              className={`text-sm font-medium ${config.color} hover:underline mt-2 block`}
            >
              View Order Details →
            </button>
          </div>

          <button
            onClick={() => {
              setIsVisible(false);
              if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
              }
              onClose?.();
            }}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
