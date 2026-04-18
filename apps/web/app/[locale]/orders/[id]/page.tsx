"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useRouter, useParams } from "next/navigation";
import { ordersApi } from "@/lib/api";
import { supabase } from "@/lib/supabase-client";
import { showToast } from "@/lib/toast";
import {
  ArrowLeft,
  Check,
  Clock,
  Package,
  Bike,
  Home,
  XCircle,
  FileText,
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
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [driverPos, setDriverPos] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  useEffect(() => {
    fetchOrder();

    // Subscribe to real-time status updates
    const subscription = supabase
      .channel(`order-${id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `id=eq.${id}`,
        },
        (payload) => {
          console.log("Order status updated:", payload.new);
          setOrder(payload.new);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [id]);

  // Driver movement simulation
  useEffect(() => {
    if (!order || order.status !== "OUT_FOR_DELIVERY") return;

    const rLat = Number(order.restaurant_lat);
    const rLng = Number(order.restaurant_lng);
    const cLat = Number(order.customer_lat);
    const cLng = Number(order.customer_lng);

    if (!rLat || !cLat) return;

    let progress = 0.3; // Start 30% along the path
    setDriverPos({
      lat: rLat + (cLat - rLat) * progress,
      lng: rLng + (cLng - rLng) * progress,
    });

    const interval = setInterval(() => {
      progress += 0.01;
      if (progress >= 1) {
        clearInterval(interval);
        return;
      }
      setDriverPos({
        lat: rLat + (cLat - rLat) * progress,
        lng: rLng + (cLng - rLng) * progress,
      });
    }, 3000); // Update every 3s

    return () => clearInterval(interval);
  }, [order?.status]);

  const fetchOrder = async () => {
    setLoading(true);
    const { data, error } = await ordersApi.get(id as string);
    if (data) {
      setOrder(data);
    } else {
      setError(error || "Order not found");
    }
    setLoading(false);
  };

  const handleCancel = async () => {
    if (!order || order.status !== "PENDING") return;

    const { error } = await ordersApi.cancel(id as string);
    if (!error) {
      fetchOrder();
    } else {
      showToast.error(error);
    }
  };

  const handleDownloadReceipt = async () => {
    const { data, error } = await ordersApi.downloadReceipt(id as string);
    if (error || !data) {
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-zinc-50">
        <div className="w-10 h-10 border-4 border-red-500 border-t-transparent animate-spin rounded-full" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
        <p className="text-zinc-500 mb-6">{error || "Something went wrong"}</p>
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

  const getStepIcon = (step: string) => {
    switch (step) {
      case "PENDING":
        return <Clock className="w-5 h-5" />;
      case "CONFIRMED":
        return <Check className="w-5 h-5" />;
      case "PREPARING":
        return <Package className="w-5 h-5" />;
      case "READY_FOR_PICKUP":
        return <Check className="w-5 h-5" />;
      case "OUT_FOR_DELIVERY":
        return <Bike className="w-5 h-5" />;
      case "DELIVERED":
        return <Home className="w-5 h-5" />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5] pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-zinc-100 px-4 h-16 flex items-center justify-between">
        <button onClick={() => router.push(`/${locale}`)} className="p-2 -ml-2">
          <ArrowLeft className="w-6 h-6 text-zinc-900" />
        </button>
        <h1 className="text-lg font-bold text-zinc-900">{t("title")}</h1>
        <div className="w-10" />
      </div>

      <div className="max-w-md mx-auto p-4 space-y-4">
        {/* Status Stepper Card */}
        <div className="bg-white p-6 rounded-[12px] shadow-sm border border-zinc-100">
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
                      w-8 h-8 rounded-full flex items-center justify-center relative z-1
                      ${
                        isActive
                          ? "bg-[#E2103C] shadow-lg shadow-red-200"
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
                        className={`w-[2px] h-10 -my-1 ${isPast ? "bg-[#E2103C]" : "bg-zinc-100"}`}
                      />
                    )}
                  </div>
                  <div className="pt-1">
                    <p
                      className={`text-sm font-bold ${isActive ? "text-[#E2103C]" : isPast ? "text-zinc-900" : "text-zinc-400"}`}
                    >
                      {t(`status.${step}`)}
                    </p>
                    {isActive && (
                      <p className="text-xs text-zinc-500 mt-1">
                        {step === "OUT_FOR_DELIVERY"
                          ? t("onTheWay")
                          : t("liveTracking")}
                      </p>
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

        {/* Map Integration */}
        <div className="bg-white p-2 rounded-[16px] shadow-sm border border-zinc-100 overflow-hidden h-[240px]">
          {order.restaurant_lat && order.customer_lat ? (
            <Map
              center={{
                lat:
                  (Number(order.restaurant_lat) + Number(order.customer_lat)) /
                  2,
                lng:
                  (Number(order.restaurant_lng) + Number(order.customer_lng)) /
                  2,
              }}
              zoom={13}
              markers={[
                {
                  lat: Number(order.restaurant_lat),
                  lng: Number(order.restaurant_lng),
                  color: "#E2103C",
                  label: "Shop",
                },
                {
                  lat: Number(order.customer_lat),
                  lng: Number(order.customer_lng),
                  color: "#000",
                  label: "Home",
                },
              ]}
              driverLocation={driverPos || undefined}
              className="h-full w-full rounded-[12px]"
            />
          ) : (
            <div className="h-full w-full bg-zinc-100 flex items-center justify-center text-zinc-400">
              No location data available
            </div>
          )}
        </div>

        {/* Items Card */}
        <div className="bg-white p-6 rounded-[12px] shadow-sm border border-zinc-100 space-y-4">
          <h2 className="text-lg font-bold text-zinc-900">{t("summary")}</h2>
          <div className="space-y-4">
            {order.items.map((item: any, idx: number) => (
              <div key={idx} className="flex justify-between text-sm">
                <div className="flex-1">
                  <p className="font-bold text-zinc-900">
                    {item.quantity}x{" "}
                    {typeof item.name === "object"
                      ? item.name[locale as "tr" | "en"]
                      : item.name}
                  </p>
                  {item.selectedModifiers?.map((m: any, midx: number) => (
                    <p key={midx} className="text-xs text-zinc-500">
                      {m.optionName}
                    </p>
                  ))}
                </div>
                <p className="font-medium">
                  ₺
                  {(item.lineTotal || item.unitPrice * item.quantity).toFixed(
                    2,
                  )}
                </p>
              </div>
            ))}

            <div className="pt-4 border-t border-zinc-100 space-y-2">
              <div className="flex justify-between text-zinc-600 text-sm">
                <span>Subtotal</span>
                <span>₺{Number(order.subtotal).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-zinc-600 text-sm">
                <span>Delivery Fee</span>
                <span>₺{Number(order.delivery_fee).toFixed(2)}</span>
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
            Download Receipt (PNG)
          </button>
        )}

        {/* Cancel Button */}
        {order.status === "PENDING" && (
          <button
            onClick={handleCancel}
            className="w-full h-14 rounded-[12px] border-2 border-[#E2103C] text-[#E2103C] font-bold text-lg hover:bg-red-50 transition-colors"
          >
            {t("cancelOrder")}
          </button>
        )}
      </div>
    </div>
  );
}
