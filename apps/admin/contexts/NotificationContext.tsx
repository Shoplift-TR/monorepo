"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { useAdminAuth } from "./AdminAuthContext";

interface OrderNotification {
  id: string;
  total: number;
  restaurant_id: string;
  created_at: string;
}

interface NotificationContextType {
  unreadCount: number;
  notifications: OrderNotification[];
  clearNotifications: () => void;
  dismissNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined,
);

export function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAdminAuth();
  const [notifications, setNotifications] = useState<OrderNotification[]>([]);

  useEffect(() => {
    if (!user?.restaurantId) return;

    const channelName = `restaurant:${user.restaurantId}`;

    const channel = supabaseAdmin
      .channel(channelName)
      .on("broadcast", { event: "new_order" }, (payload: any) => {
        const newOrder = payload.payload as OrderNotification;
        setNotifications((prev) => [newOrder, ...prev]);
        playDing();
      })
      .subscribe();

    return () => {
      supabaseAdmin.removeChannel(channel);
    };
  }, [user?.restaurantId]);

  const playDing = () => {
    const audio = new Audio("/sounds/notification.mp3");
    audio.play().catch(() => {});
  };

  const clearNotifications = () => setNotifications([]);

  const dismissNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <NotificationContext.Provider
      value={{
        unreadCount: notifications.length,
        notifications,
        clearNotifications,
        dismissNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotifications must be used within a NotificationProvider",
    );
  }
  return context;
};
