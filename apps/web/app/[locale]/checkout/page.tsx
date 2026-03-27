"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { useRouter } from "@/lib/navigation";
import { useCart } from "@/contexts/CartContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { addressesApi, ordersApi, promosApi, restaurantsApi } from "@/lib/api";
import {
  ArrowLeft,
  ChevronRight,
  Plus,
  Check,
  CreditCard,
  Banknote,
} from "lucide-react";
import { showToast } from "@/lib/toast";

type Step = "address" | "review" | "confirm";

export default function CheckoutPage() {
  const t = useTranslations("checkout");
  const router = useRouter();
  const { locale } = useParams();
  const { items, restaurantId, totalPrice, clearCart } = useCart();

  const [currentStep, setCurrentStep] = useState<Step>("address");
  const [addresses, setAddresses] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    null,
  );
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [newAddress, setNewAddress] = useState({
    label: "",
    street: "",
    district: "",
    city: "",
  });

  const [promoCode, setPromoCode] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<any>(null);
  const [promoError, setPromoError] = useState("");

  const [paymentMethod, setPaymentMethod] = useState<"card" | "cash">("card");
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [restaurantDeliveryFee, setRestaurantDeliveryFee] = useState(0);

  const deliveryFee = restaurantDeliveryFee;
  const discount = appliedPromo?.discount || 0;
  const grandTotal = totalPrice + deliveryFee - discount;

  useEffect(() => {
    if (items.length === 0) {
      // Empty cart handling
    } else {
      fetchAddresses();
      if (restaurantId) {
        restaurantsApi.get(restaurantId).then(({ data }) => {
          if (data) {
            setRestaurantDeliveryFee(Number((data as any).deliveryFee ?? 0));
          }
        });
      }
    }
  }, [items, restaurantId]);

  const fetchAddresses = async () => {
    const { data, error } = await addressesApi.list();
    if (data) {
      setAddresses(data);
      if (data.length > 0 && !selectedAddressId) {
        setSelectedAddressId(data[0].id);
      }
    }
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data, error } = await addressesApi.create(newAddress);
    if (data) {
      setAddresses([data, ...addresses]);
      setSelectedAddressId(data.id);
      setShowAddAddress(false);
      setNewAddress({ label: "", street: "", district: "", city: "" });
    }
  };

  const validatePromo = async () => {
    if (!promoCode || !restaurantId) return;
    setPromoError("");
    const { data, error } = await promosApi.validate({
      code: promoCode,
      restaurantId,
      cartTotal: totalPrice,
      cartItemIds: items.map((i) => i.itemId),
    });

    if (error) {
      setPromoError(t("invalidPromo"));
      setAppliedPromo(null);
    } else if (data && data.valid) {
      setAppliedPromo(data);
    } else {
      setPromoError(t("invalidPromo"));
    }
  };

  const handlePlaceOrder = async () => {
    if (!restaurantId || !selectedAddressId) return;

    setIsPlacingOrder(true);
    const { data, error } = await ordersApi.create({
      restaurantId,
      items: items.map((item) => ({
        itemId: item.itemId,
        quantity: item.quantity,
        selectedModifiers: item.selectedModifiers.flatMap((m) =>
          m.selectedOptions.map((o) => ({
            groupName: typeof m.name === "object" ? m.name.en : m.name,
            optionName: typeof o.name === "object" ? o.name.en : o.name,
            priceAdjustment: o.price,
          })),
        ),
      })),
      promoCode: appliedPromo?.code,
      deliveryAddressId: selectedAddressId,
      paymentMethod,
      notes: "",
    });

    setIsPlacingOrder(false);

    if (data) {
      clearCart();
      router.push(`/orders/${data.id}`);
    } else {
      showToast.error(error || "Failed to place order");
    }
  };

  if (items.length === 0) {
    return (
      <ProtectedRoute requiredRole="customer">
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
          <p className="text-zinc-500 mb-6">{t("emptyCart")}</p>
          <button
            onClick={() => router.push(`/`)}
            className="px-8 h-12 rounded-full bg-[#E2103C] text-white font-bold"
          >
            {t("stepAddress")}
          </button>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRole="customer">
      <div className="min-h-screen bg-white">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-zinc-100 px-4 h-16 flex items-center justify-between">
          <button onClick={() => router.back()} className="p-2 -ml-2">
            <ArrowLeft className="w-6 h-6 text-zinc-900" />
          </button>
          <h1 className="text-lg font-bold text-zinc-900">{t("title")}</h1>
          <div className="w-10" />
        </div>

        {/* Step Indicator */}
        <div className="px-4 py-6 flex items-center justify-between max-w-md mx-auto">
          {[
            { id: "address", label: t("stepAddress") },
            { id: "review", label: t("stepReview") },
            { id: "confirm", label: t("stepConfirm") },
          ].map((s, idx) => {
            const isCompleted =
              (currentStep === "review" && s.id === "address") ||
              (currentStep === "confirm" &&
                (s.id === "address" || s.id === "review"));
            const isActive = currentStep === s.id;

            return (
              <div
                key={s.id}
                className="flex flex-col items-center gap-2 flex-1 relative"
              >
                <div
                  className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                  ${
                    isCompleted
                      ? "bg-green-500 text-white"
                      : isActive
                        ? "bg-[#E2103C] text-white"
                        : "bg-zinc-200 text-zinc-500"
                  }
                `}
                >
                  {isCompleted ? <Check className="w-5 h-5" /> : idx + 1}
                </div>
                <span
                  className={`text-xs font-medium ${isActive ? "text-[#E2103C]" : "text-zinc-500"}`}
                >
                  {s.label}
                </span>
                {idx < 2 && (
                  <div className="absolute top-4 left-[calc(50%+20px)] w-[calc(100%-40px)] h-[2px] bg-zinc-100" />
                )}
              </div>
            );
          })}
        </div>

        <div className="px-4 pb-24 max-w-md mx-auto">
          {/* Step 1: Address */}
          {currentStep === "address" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-zinc-900">
                  {t("savedAddresses")}
                </h2>
              </div>

              <div className="space-y-3">
                {addresses.map((addr) => (
                  <button
                    key={addr.id}
                    onClick={() => setSelectedAddressId(addr.id)}
                    className={`
                      w-full text-left p-4 rounded-[12px] border transition-all
                      ${
                        selectedAddressId === addr.id
                          ? "border-[#E2103C] border-[2px] bg-red-50/30"
                          : "border-zinc-200 bg-white shadow-sm"
                      }
                    `}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-zinc-900">{addr.label}</p>
                        <p className="text-sm text-zinc-600 mt-1">
                          {addr.street}
                        </p>
                        <p className="text-xs text-zinc-400 mt-0.5">
                          {addr.district}, {addr.city}
                        </p>
                      </div>
                      {selectedAddressId === addr.id && (
                        <div className="w-5 h-5 rounded-full bg-[#E2103C] flex items-center justify-center">
                          <Check className="w-3.5 h-3.5 text-white" />
                        </div>
                      )}
                    </div>
                  </button>
                ))}

                <button
                  onClick={() => setShowAddAddress(true)}
                  className="w-full flex items-center justify-center gap-2 py-4 rounded-[12px] border border-[#E2103C] text-[#E2103C] font-bold active:bg-red-50 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  {t("addNewAddress")}
                </button>
              </div>

              {showAddAddress && (
                <form
                  onSubmit={handleAddAddress}
                  className="space-y-4 p-4 rounded-xl bg-zinc-50 border border-zinc-100 mt-4"
                >
                  <input
                    placeholder={t("label")}
                    value={newAddress.label}
                    onChange={(e) =>
                      setNewAddress({ ...newAddress, label: e.target.value })
                    }
                    className="w-full h-12 px-4 rounded-lg bg-white border border-zinc-200 focus:outline-none focus:border-[#E2103C]"
                    required
                  />
                  <input
                    placeholder={t("street")}
                    value={newAddress.street}
                    onChange={(e) =>
                      setNewAddress({ ...newAddress, street: e.target.value })
                    }
                    className="w-full h-12 px-4 rounded-lg bg-white border border-zinc-200 focus:outline-none focus:border-[#E2103C]"
                    required
                  />
                  <div className="flex gap-3">
                    <input
                      placeholder={t("district")}
                      value={newAddress.district}
                      onChange={(e) =>
                        setNewAddress({
                          ...newAddress,
                          district: e.target.value,
                        })
                      }
                      className="w-full h-12 px-4 rounded-lg bg-white border border-zinc-200 focus:outline-none focus:border-[#E2103C]"
                      required
                    />
                    <input
                      placeholder={t("city")}
                      value={newAddress.city}
                      onChange={(e) =>
                        setNewAddress({ ...newAddress, city: e.target.value })
                      }
                      className="w-full h-12 px-4 rounded-lg bg-white border border-zinc-200 focus:outline-none focus:border-[#E2103C]"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full h-12 rounded-full bg-[#E2103C] text-white font-bold"
                  >
                    {t("saveAddress")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddAddress(false)}
                    className="w-full h-12 text-zinc-500 font-bold"
                  >
                    {t("cancel")}
                  </button>
                </form>
              )}

              {selectedAddressId && !showAddAddress && (
                <button
                  onClick={() => setCurrentStep("review")}
                  className="w-full h-14 mt-6 rounded-full bg-[#E2103C] text-white font-bold text-lg active:scale-[0.98] transition-all"
                >
                  {t("stepReview")}
                </button>
              )}
            </div>
          )}

          {/* Step 2: Review */}
          {currentStep === "review" && (
            <div className="space-y-6">
              <div className="bg-white p-4 rounded-[12px] border border-zinc-100 shadow-sm">
                <h2 className="text-lg font-bold text-zinc-900 mb-4">
                  {t("orderSummary")}
                </h2>
                <div className="space-y-3">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="flex justify-between items-start"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-bold text-zinc-900">
                          {item.quantity}x{" "}
                          {typeof item.name === "object"
                            ? item.name[locale as "tr" | "en"]
                            : item.name}
                        </p>
                        {item.selectedModifiers.map((m) => (
                          <p key={m.id} className="text-xs text-zinc-500">
                            {m.selectedOptions
                              .map((o) =>
                                typeof o.name === "object"
                                  ? o.name[locale as "tr" | "en"]
                                  : o.name,
                              )
                              .join(", ")}
                          </p>
                        ))}
                      </div>
                      <p className="text-sm font-medium text-zinc-900">
                        ₺{(item.price * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-6 pt-4 border-t border-zinc-100 space-y-2">
                  <div className="flex justify-between text-zinc-600 text-sm">
                    <span>{t("subtotal")}</span>
                    <span>₺{totalPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-zinc-600 text-sm">
                    <span>{t("deliveryFee")}</span>
                    <span>₺{deliveryFee.toFixed(2)}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-green-600 text-sm font-medium">
                      <span>{t("discount")}</span>
                      <span>-₺{discount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-zinc-900 font-bold text-lg pt-2">
                    <span>{t("total")}</span>
                    <span>₺{grandTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-bold text-zinc-900 px-1">
                  {t("promoCode")}
                </p>
                <div className="flex gap-2">
                  <input
                    placeholder={t("promoCode")}
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    className="flex-1 h-12 px-4 rounded-full bg-zinc-100 text-sm focus:outline-none"
                  />
                  <button
                    onClick={validatePromo}
                    className="px-6 h-12 rounded-full bg-[#E2103C] text-white font-bold text-sm"
                  >
                    {t("apply")}
                  </button>
                </div>
                {promoError && (
                  <p className="text-xs text-red-500 px-4">{promoError}</p>
                )}
                {appliedPromo && (
                  <p className="text-xs text-green-600 px-4">
                    {t("promoApplied")}: {appliedPromo.code}
                  </p>
                )}
              </div>

              <div className="space-y-4">
                <p className="text-sm font-bold text-zinc-900 px-1">
                  {t("paymentMethod")}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setPaymentMethod("card")}
                    className={`
                      h-16 rounded-[12px] border flex flex-col items-center justify-center gap-1 transition-all
                      ${paymentMethod === "card" ? "border-[#E2103C] border-[2px] bg-red-50/30 text-[#E2103C]" : "border-zinc-200 text-zinc-500"}
                    `}
                  >
                    <CreditCard className="w-5 h-5" />
                    <span className="text-xs font-bold">{t("card")}</span>
                  </button>
                  <button
                    onClick={() => setPaymentMethod("cash")}
                    className={`
                      h-16 rounded-[12px] border flex flex-col items-center justify-center gap-1 transition-all
                      ${paymentMethod === "cash" ? "border-[#E2103C] border-[2px] bg-red-50/30 text-[#E2103C]" : "border-zinc-200 text-zinc-500"}
                    `}
                  >
                    <Banknote className="w-5 h-5" />
                    <span className="text-xs font-bold">{t("cash")}</span>
                  </button>
                </div>
              </div>

              <button
                onClick={() => setCurrentStep("confirm")}
                className="w-full h-14 mt-4 rounded-full bg-[#E2103C] text-white font-bold text-lg active:scale-[0.98]"
              >
                {t("stepConfirm")}
              </button>

              <button
                onClick={() => setCurrentStep("address")}
                className="w-full h-12 text-zinc-500 font-bold"
              >
                {t("cancel")}
              </button>
            </div>
          )}

          {/* Step 3: Confirm */}
          {currentStep === "confirm" && (
            <div className="flex flex-col items-center justify-center pt-8 text-center space-y-6">
              <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-[#E2103C] flex items-center justify-center shadow-lg shadow-red-200">
                  <Check className="w-8 h-8 text-white stroke-[3px]" />
                </div>
              </div>

              <div>
                <h2 className="text-2xl font-extrabold text-zinc-900">
                  {t("total")} ₺{grandTotal.toFixed(2)}
                </h2>
                <p className="text-sm text-zinc-500 mt-2">
                  {t("orderSummary")} - {items.length} items
                </p>
              </div>

              <button
                disabled={isPlacingOrder}
                onClick={handlePlaceOrder}
                className={`
                  w-full h-[56px] rounded-full bg-[#E2103C] text-white font-bold text-lg shadow-lg shadow-red-100 flex items-center justify-center gap-3
                  ${isPlacingOrder ? "opacity-70 cursor-not-allowed" : "active:scale-[0.98]"}
                `}
              >
                {isPlacingOrder ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent animate-spin rounded-full" />
                ) : null}
                {t("placeOrder")}
              </button>

              <button
                disabled={isPlacingOrder}
                onClick={() => setCurrentStep("review")}
                className="w-full h-12 text-zinc-500 font-bold"
              >
                {t("cancel")}
              </button>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
