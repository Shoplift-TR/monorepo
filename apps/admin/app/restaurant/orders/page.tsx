"use client";

import { useEffect, useState } from "react";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { adminApi } from "@/lib/api";

const COLUMNS = [
  {
    id: "PENDING",
    label: "Pending",
    bg: "bg-orange-50",
    border: "border-orange-200",
    badge: "bg-orange-100 text-orange-800",
  },
  {
    id: "CONFIRMED",
    label: "Confirmed",
    bg: "bg-blue-50",
    border: "border-blue-200",
    badge: "bg-blue-100 text-blue-800",
  },
  {
    id: "PREPARING",
    label: "Preparing",
    bg: "bg-yellow-50",
    border: "border-yellow-200",
    badge: "bg-yellow-100 text-yellow-800",
  },
  {
    id: "READY_FOR_PICKUP",
    label: "Ready",
    bg: "bg-green-50",
    border: "border-green-200",
    badge: "bg-green-100 text-green-800",
  },
];

export default function OrderQueuePage() {
  const { user } = useAdminAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    setLoading(true);
    const { data } = await adminApi.getOrders();
    if (data) {
      setOrders(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!user?.restaurantId) return;

    // Request notification permission
    if ("Notification" in window && Notification.permission !== "granted") {
      Notification.requestPermission();
    }

    fetchOrders();

    const channel = supabaseAdmin
      .channel("restaurant-orders")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `restaurant_id=eq.${user.restaurantId}`,
        },
        (payload: any) => {
          if (payload.eventType === "INSERT") {
            // New order beep
            playBeep();
            if (Notification.permission === "granted") {
              new Notification("New Order!", {
                body: `Order total: ₺${payload.new.total.toFixed(2)}`,
              });
            }
            setOrders((prev) => [payload.new, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            setOrders((prev) =>
              prev.map((o) => (o.id === payload.new.id ? payload.new : o)),
            );
          }
        },
      )
      .subscribe();

    return () => {
      supabaseAdmin.removeChannel(channel);
    };
  }, [user]);

  const playBeep = () => {
    try {
      const audioCtx = new (
        window.AudioContext || (window as any).webkitAudioContext
      )();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.type = "sine";
      oscillator.frequency.value = 800;
      gainNode.gain.setValueAtTime(1, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(
        0.001,
        audioCtx.currentTime + 0.5,
      );
      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.5);
    } catch (e) {
      console.error("Audio beep failed", e);
    }
  };

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    const { data } = await adminApi.updateOrderStatus(
      orderId,
      newStatus as any,
    );
    if (data) {
      setOrders((prev) => prev.map((o) => (o.id === orderId ? data : o)));
    }
  };

  const renderActionButtons = (order: any) => {
    switch (order.status) {
      case "PENDING":
        return (
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => handleUpdateStatus(order.id, "CONFIRMED")}
              className="flex-1 py-2 rounded-lg bg-green-600 text-white text-xs font-bold hover:bg-green-700 transition"
            >
              Accept
            </button>
            <button
              onClick={() => handleUpdateStatus(order.id, "CANCELLED")}
              className="flex-1 py-2 rounded-lg border border-[#E2103C] text-[#E2103C] text-xs font-bold hover:bg-red-50 transition"
            >
              Reject
            </button>
          </div>
        );
      case "CONFIRMED":
        return (
          <button
            onClick={() => handleUpdateStatus(order.id, "PREPARING")}
            className="w-full mt-4 py-2 rounded-lg bg-[#E2103C] text-white text-xs font-bold hover:bg-red-700 transition"
          >
            Start Preparing
          </button>
        );
      case "PREPARING":
        return (
          <button
            onClick={() => handleUpdateStatus(order.id, "READY_FOR_PICKUP")}
            className="w-full mt-4 py-2 rounded-lg bg-[#E2103C] text-white text-xs font-bold hover:bg-red-700 transition"
          >
            Mark Ready
          </button>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return <div className="p-8 text-zinc-500">Loading orders...</div>;
  }

  return (
    <div className="p-8 h-screen flex flex-col">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-zinc-900">Live Orders</h1>
      </div>

      <div className="flex-1 flex gap-6 overflow-x-auto pb-4">
        {COLUMNS.map((col) => {
          const colOrders = orders
            .filter((o) => o.status === col.id)
            .sort(
              (a, b) =>
                new Date(a.created_at).getTime() -
                new Date(b.created_at).getTime(),
            );

          return (
            <div
              key={col.id}
              className={`flex-none w-[320px] rounded-[16px] border ${col.border} ${col.bg} flex flex-col p-4 shadow-sm`}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-zinc-900 text-sm tracking-wide uppercase">
                  {col.label}
                </h2>
                <div
                  className={`px-2 py-0.5 rounded-full text-xs font-bold ${col.badge}`}
                >
                  {colOrders.length}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 pb-2 custom-scrollbar">
                {colOrders.length === 0 ? (
                  <div className="h-24 border border-dashed border-zinc-300 rounded-[12px] flex items-center justify-center text-xs text-zinc-400 font-medium">
                    No orders
                  </div>
                ) : (
                  colOrders.map((order) => {
                    const elapsed = Math.floor(
                      (Date.now() - new Date(order.created_at).getTime()) /
                        60000,
                    );

                    return (
                      <div
                        key={order.id}
                        className="bg-white p-4 rounded-[12px] shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-zinc-100 flex flex-col"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-mono text-xs text-zinc-400 bg-zinc-100 px-1 py-0.5 rounded">
                            #{order.id.slice(0, 8)}
                          </span>
                          <span
                            className={`text-xs font-bold ${elapsed > 15 && order.status === "PENDING" ? "text-red-500" : "text-zinc-500"}`}
                          >
                            {elapsed}m ago
                          </span>
                        </div>

                        <div className="text-sm font-semibold text-zinc-900 mb-3 truncate">
                          Customer:{" "}
                          <span className="font-bold text-black">
                            {order.delivery_address_snapshot?.label || "Direct"}
                          </span>
                        </div>

                        <div className="space-y-1 mb-3">
                          {order.items.map((item: any, idx: number) => (
                            <div
                              key={idx}
                              className="text-[13px] text-zinc-700 flex justify-between"
                            >
                              <span className="truncate pr-2">
                                <span className="font-bold">
                                  {item.quantity}x
                                </span>{" "}
                                {typeof item.name === "object"
                                  ? item.name.en
                                  : item.name}
                              </span>
                            </div>
                          ))}
                        </div>

                        <div className="mt-auto flex items-end justify-between pt-3 border-t border-zinc-50">
                          <span className="text-xs text-zinc-500">
                            {order.items.length} items
                          </span>
                          <span className="font-bold text-[#E2103C]">
                            ₺{order.total.toFixed(2)}
                          </span>
                        </div>

                        {renderActionButtons(order)}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
