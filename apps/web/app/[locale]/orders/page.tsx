"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useRouter as useIntlRouter } from "@/lib/navigation";
import { ordersApi } from "@/lib/api";
import ProtectedRoute from "@/components/ProtectedRoute";
import { showToast } from "@/lib/toast";

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  PENDING: { label: "Pending", color: "#f59e0b", bg: "#fef3c7" },
  CONFIRMED: { label: "Confirmed", color: "#3b82f6", bg: "#dbeafe" },
  PREPARING: { label: "Preparing", color: "#8b5cf6", bg: "#ede9fe" },
  READY_FOR_PICKUP: { label: "Ready", color: "#10b981", bg: "#d1fae5" },
  OUT_FOR_DELIVERY: { label: "On the way", color: "#06b6d4", bg: "#cffafe" },
  DELIVERED: { label: "Delivered", color: "#92fc40", bg: "#f0fdf4" },
  CANCELLED: { label: "Cancelled", color: "#ef4444", bg: "#fee2e2" },
};

export default function OrdersPage() {
  const { locale } = useParams();
  const router = useIntlRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      const { data, error } = await ordersApi.history();
      if (error) {
        showToast.error("Failed to load orders.");
      } else {
        setOrders(data || []);
      }
      setLoading(false);
    };
    fetchOrders();
  }, []);

  return (
    <ProtectedRoute requiredRole="customer">
      <div className="min-h-screen bg-[var(--surface)] pt-8 pb-16 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1
              className="text-[#101744] dark:text-[#e8eaf0] font-extrabold 
                           text-2xl tracking-[-0.04em]"
            >
              My Orders
            </h1>
            <div className="h-[3px] w-10 bg-[#92fc40] mt-1" />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-24">
              <div
                className="w-10 h-10 border-[3px] border-[#92fc40] 
                              border-t-transparent animate-spin rounded-full"
              />
            </div>
          ) : orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div
                className="w-16 h-16 rounded-2xl bg-[#101744] flex items-center 
                              justify-center mb-4"
              >
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    stroke="#92fc40"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <p className="text-[#101744] dark:text-[#e8eaf0] font-bold text-lg mb-2">
                No orders yet
              </p>
              <p className="text-[#5e5e5e] dark:text-[#9ba3b8] text-sm mb-6">
                Your order history will appear here
              </p>
              <button
                onClick={() => router.push("/restaurants")}
                className="h-11 px-6 rounded-full bg-[#92fc40] text-[#0b2000] 
                           font-bold text-sm hover:bg-[#77df1e] transition-colors"
              >
                Browse Restaurants
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {orders.map((order) => {
                const statusConfig =
                  STATUS_CONFIG[order.status] || STATUS_CONFIG.PENDING;
                const itemCount = order.items?.length ?? 0;
                const date = new Date(order.created_at || order.createdAt);

                return (
                  <div
                    key={order.id}
                    onClick={() => router.push(`/orders/${order.id}`)}
                    className="bg-white dark:bg-[#1e2235] rounded-[12px] p-5 cursor-pointer
                               shadow-[0_12px_24px_rgba(0,4,53,0.08)] 
                               hover:shadow-[0_16px_32px_rgba(0,4,53,0.12)]
                               transition-all active:scale-[0.99]"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p
                          className="text-[0.6875rem] font-bold uppercase 
                                      tracking-[0.05em] text-[#5e5e5e] dark:text-[#9ba3b8] mb-1"
                        >
                          {date.toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                        <p
                          className="text-[#101744] dark:text-[#e8eaf0] 
                                      font-bold text-[0.9375rem]"
                        >
                          {itemCount} item{itemCount !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <span
                        className="px-3 py-1 rounded-full text-[0.6875rem] font-bold 
                                   uppercase tracking-[0.05em]"
                        style={{
                          color: statusConfig.color,
                          background: statusConfig.bg,
                        }}
                      >
                        {statusConfig.label}
                      </span>
                    </div>

                    <div className="flex justify-between items-end">
                      <p
                        className="text-[#5e5e5e] dark:text-[#9ba3b8] text-sm truncate 
                                    max-w-[60%]"
                      >
                        {order.items
                          ?.slice(0, 2)
                          .map((i: any) =>
                            typeof i.name === "object" ? i.name.en : i.name,
                          )
                          .join(", ")}
                        {order.items?.length > 2 &&
                          ` +${order.items.length - 2} more`}
                      </p>
                      <p
                        className="text-[#101744] dark:text-[#e8eaf0] 
                                    font-extrabold text-lg"
                      >
                        ₺{Number(order.total).toFixed(2)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
