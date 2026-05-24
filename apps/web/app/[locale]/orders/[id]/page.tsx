"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter, useParams } from "next/navigation";
import { ordersApi } from "@/lib/api";
import { useOrderTracking } from "@/hooks/useOrderTracking";
import { showToast } from "@/lib/toast";
import {
  ArrowLeft,
  Check,
  XCircle,
  FileText,
  RefreshCw,
  Bell,
  MapPin,
} from "lucide-react";
import Map from "@/components/Map";

const STEPS = [
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "READY_FOR_PICKUP",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
];

export default function OrderDetailsPage() {
  const t = useTranslations("orderDetail");
  const router = useRouter();
  const { locale, id } = useParams();

  // Use the enhanced order tracking hook
  const {
    order,
    isLoading,
    isRealTime,
    driverPosition,
    estimatedDeliveryTime,
    progressPercentage,
    canCancel,
    refreshTracking,
    cancelOrder: cancelOrderAction,
  } = useOrderTracking(id as string);

  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleCancel = async () => {
    if (!canCancel) return;

    try {
      await cancelOrderAction();
      showToast.success("Order cancelled successfully");
    } catch (error) {
      console.error(error);
      showToast.error("Failed to cancel order");
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshTracking();
      showToast.success("Order status updated");
    } catch (error) {
      console.error(error);
      showToast.error("Failed to refresh order");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleDownloadReceipt = async () => {
    const { data, error } = await ordersApi.downloadReceipt(id as string);
    if (error || !data) {
      console.error(error);
      showToast.error(error || "Failed to download receipt");
      return;
    }

    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = `receipt_${String(id).slice(0, 8)}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-zinc-50">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-red-500 border-t-transparent animate-spin rounded-full mx-auto mb-4" />
          <p className="text-zinc-600">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
        <p className="text-zinc-500 mb-6">Order not found</p>
        <button
          onClick={() => router.push(`/${locale}/orders`)}
          className="px-6 h-12 rounded-full border border-zinc-200"
        >
          Go Back
        </button>
      </div>
    );
  }

  const currentStepIndex = STEPS.indexOf(order.status);
  const isCancelled = order.status === "CANCELLED";

  return (
    <div className="min-h-screen bg-[#F5F5F5] pb-20">
      {/* Header with real-time indicator */}
      <div className="sticky top-0 z-10 bg-white border-b border-zinc-100 px-4 h-16 flex items-center justify-between">
        <button
          onClick={() => router.push(`/${locale}/orders`)}
          className="p-2 -ml-2"
        >
          <ArrowLeft className="w-6 h-6 text-zinc-900" />
        </button>
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold text-zinc-900">{t("title")}</h1>
          {isRealTime && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs text-green-600 font-medium">Live</span>
            </div>
          )}
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="p-2 -mr-2 disabled:opacity-50"
        >
          <RefreshCw
            className={`w-5 h-5 text-zinc-900 ${isRefreshing ? "animate-spin" : ""}`}
          />
        </button>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-4">
        {/* Order Status Card */}
        <div className="bg-white p-6 rounded-[12px] shadow-sm border border-zinc-100">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-zinc-900">Order Status</h2>
            {estimatedDeliveryTime && (
              <div className="text-right">
                <p className="text-xs text-zinc-500">Est. Delivery</p>
                <p className="text-sm font-bold text-zinc-900">
                  {new Date(estimatedDeliveryTime).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            )}
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-zinc-500">Progress</span>
              <span className="text-xs font-bold text-zinc-700">
                {Math.round(progressPercentage)}%
              </span>
            </div>
            <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#E2103C] transition-all duration-500 ease-out"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>

          {/* Status Steps */}
          <div className="flex flex-col space-y-6">
            {STEPS.map((step, idx) => {
              const isActive = step === order.status;
              const isPast = currentStepIndex > idx;

              if (isCancelled && idx > currentStepIndex) return null;

              return (
                <div key={step} className="flex gap-4 relative">
                  <div className="flex flex-col items-center">
                    <div
                      className={`
                      w-8 h-8 rounded-full flex items-center justify-center relative z-1 transition-all
                      ${
                        isActive
                          ? "bg-[#E2103C] shadow-lg shadow-red-200 scale-110"
                          : isPast
                            ? "bg-[#E2103C]"
                            : "bg-zinc-100 text-zinc-400"
                      }
                    `}
                    >
                      {isPast || (isActive && step === "DELIVERED") ? (
                        <Check className="w-5 h-5 text-white" />
                      ) : isActive ? (
                        <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
                      ) : (
                        <div className="w-1.5 h-1.5 bg-zinc-300 rounded-full" />
                      )}
                    </div>
                    {idx < STEPS.length - 1 && !isCancelled && (
                      <div
                        className={`w-0.5 h-10 -my-1 transition-all ${
                          isPast ? "bg-[#E2103C]" : "bg-zinc-100"
                        }`}
                      />
                    )}
                  </div>
                  <div className="pt-1 flex-1">
                    <p
                      className={`text-sm font-bold transition-colors ${
                        isActive
                          ? "text-[#E2103C]"
                          : isPast
                            ? "text-zinc-900"
                            : "text-zinc-400"
                      }`}
                    >
                      {t(`status.${step}`)}
                    </p>
                    {isActive && (
                      <p className="text-xs text-zinc-500 mt-1">
                        {step === "OUT_FOR_DELIVERY"
                          ? "Driver is on the way"
                          : "Being processed"}
                      </p>
                    )}
                    {isPast && (
                      <p className="text-xs text-green-600 mt-1">Completed</p>
                    )}
                  </div>
                </div>
              );
            })}

            {isCancelled && (
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center">
                  <XCircle className="w-5 h-5 text-white" />
                </div>
                <div className="pt-1">
                  <p className="text-sm font-bold text-zinc-900">
                    {t("status.CANCELLED")}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Enhanced Map with Real-time Tracking */}
        {order.restaurant_lat && order.customer_lat && (
          <div className="bg-white p-2 rounded-[16px] shadow-sm border border-zinc-100 overflow-hidden">
            <div className="p-3 border-b border-zinc-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-zinc-500" />
                  <h3 className="text-sm font-bold text-zinc-900">
                    Live Tracking
                  </h3>
                </div>
                {order.status === "OUT_FOR_DELIVERY" && (
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-xs text-green-600">
                      Driver moving
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div className="h-60">
              <Map
                center={{
                  lat:
                    (Number(order.restaurant_lat) +
                      Number(order.customer_lat)) /
                    2,
                  lng:
                    (Number(order.restaurant_lng) +
                      Number(order.customer_lng)) /
                    2,
                }}
                zoom={13}
                markers={[
                  {
                    lat: Number(order.restaurant_lat),
                    lng: Number(order.restaurant_lng),
                    color: "#E2103C",
                    label: "Restaurant",
                  },
                  {
                    lat: Number(order.customer_lat),
                    lng: Number(order.customer_lng),
                    color: "#000",
                    label: "Your Location",
                  },
                ]}
                driverLocation={driverPosition || undefined}
                className="h-full w-full"
              />
            </div>
          </div>
        )}

        {/* Order Summary */}
        <div className="bg-white p-6 rounded-[12px] shadow-sm border border-zinc-100 space-y-4">
          <h2 className="text-lg font-bold text-zinc-900">{t("summary")}</h2>
          <div className="space-y-4">
            {order.items.map((item, idx) => (
              <div key={idx} className="flex justify-between text-sm">
                <div className="flex-1">
                  <p className="font-bold text-zinc-900">
                    {item.quantity}x {item.name[locale as "tr" | "en"]}
                  </p>
                  {item.modifiers.map((modifier, midx) => (
                    <p key={midx} className="text-xs text-zinc-500">
                      {modifier.name[locale as "tr" | "en"]}
                    </p>
                  ))}
                </div>
                <p className="font-medium">₺{item.subtotal.toFixed(2)}</p>
              </div>
            ))}

            <div className="pt-4 border-t border-zinc-100 space-y-2">
              <div className="flex justify-between text-zinc-600 text-sm">
                <span>Subtotal</span>
                <span>₺{Number(order.subtotal).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-zinc-600 text-sm">
                <span>Delivery Fee</span>
                <span>₺{Number(order.deliveryFee).toFixed(2)}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-green-600 text-sm">
                  <span>Discount</span>
                  <span>-₺{Number(order.discount).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-zinc-900 font-bold text-lg pt-2">
                <span>Total</span>
                <span>₺{Number(order.total).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          {/* Receipt Button */}
          {[
            "CONFIRMED",
            "PREPARING",
            "READY_FOR_PICKUP",
            "OUT_FOR_DELIVERY",
            "DELIVERED",
          ].includes(order.status) && (
            <button
              type="button"
              onClick={handleDownloadReceipt}
              className="flex items-center justify-center gap-2 w-full h-12 rounded-[12px] bg-white border border-zinc-200 text-zinc-900 font-bold hover:bg-zinc-50 transition-colors"
            >
              <FileText className="w-5 h-5 text-zinc-500" />
              Download Receipt
            </button>
          )}

          {/* Cancel Button */}
          {canCancel && (
            <button
              onClick={handleCancel}
              className="w-full h-14 rounded-[12px] border-2 border-[#E2103C] text-[#E2103C] font-bold text-lg hover:bg-red-50 transition-colors"
            >
              Cancel Order
            </button>
          )}

          {/* Notification Settings */}
          {isRealTime && (
            <button
              onClick={() => {
                showToast.success("Notifications are enabled for this order");
              }}
              className="flex items-center justify-center gap-2 w-full h-12 rounded-[12px] bg-[#E2103C] text-white font-bold hover:bg-[#c20830] transition-colors"
            >
              <Bell className="w-4 h-4" />
              Notifications Enabled
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
