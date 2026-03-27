"use client";

import React, { useState, useMemo, useRef } from "react";
import { Restaurant, MenuItem } from "@shoplift/types";
import { useTranslations } from "next-intl";
import { useCart, CartModifier } from "@/contexts/CartContext";
import { useRouter } from "@/lib/navigation";
import Link from "next/link";
import { showToast } from "@/lib/toast";
import Map from "@/components/Map";
import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

interface ClientMenuProps {
  restaurant: Restaurant;
  menu: MenuItem[];
  locale: string;
}

export function ClientMenu({ restaurant, menu, locale }: ClientMenuProps) {
  const t = useTranslations("restaurants");
  const { addItem, totalItems, totalPrice, restaurantId } = useCart();
  const router = useRouter();
  const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const name =
    (restaurant.name as any)[locale] || restaurant.name["tr"] || "Restaurant";
  const desc =
    (restaurant.description as any)[locale] ||
    restaurant.description["tr"] ||
    "";

  const categories = useMemo(() => {
    return Array.from(new Set(menu.map((i) => i.category || "General")));
  }, [menu]);

  const [activeCategory, setActiveCategory] = useState(categories[0] || "");
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);

  const scrollToCategory = (category: string) => {
    setActiveCategory(category);
    const el = categoryRefs.current[category];
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 140;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };

  const handleAddItem = (item: MenuItem) => {
    if (!item.modifiers || item.modifiers.length === 0) {
      addItem(restaurant.id, {
        itemId: item.id,
        name: item.name,
        price: item.price,
        quantity: 1,
        selectedModifiers: [],
      });
      showToast.success("Added to cart");
      return;
    }
    setSelectedItem(item);
  };

  const deliveryFee = (restaurant as any).deliveryFee ?? 0;

  return (
    <div className="min-h-screen bg-[var(--surface)] dark:bg-[#0f1117] pb-32">
      {/* HERO — full width dark editorial */}
      <div
        className="relative w-full h-[320px] md:h-[400px] overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, #080c24 0%, #0a1628 50%, #0d2137 100%)",
        }}
      >
        {/* Background image if restaurant has logo */}
        {restaurant.logo && (
          <img
            src={restaurant.logo}
            alt={name}
            className="absolute inset-0 w-full h-full object-cover opacity-20"
          />
        )}

        {/* Dark overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#080c24] via-transparent to-transparent" />

        {/* Back button */}
        <button
          onClick={() => router.push("/restaurants")}
          className="absolute top-6 left-6 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center hover:bg-white/20 transition-colors z-10"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M12 15L7 10L12 5"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {/* Restaurant info overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
          <div className="max-w-5xl mx-auto flex items-end gap-4">
            {/* Logo circle */}
            <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-sm border-2 border-white/20 flex-shrink-0 overflow-hidden">
              {restaurant.logo ? (
                <img
                  src={restaurant.logo}
                  alt={name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-[#92fc40]/20 flex items-center justify-center">
                  <span className="text-[#92fc40] font-bold text-xl">
                    {name.charAt(0)}
                  </span>
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h1 className="text-white font-extrabold text-2xl md:text-3xl tracking-[-0.04em] leading-tight mb-1">
                {name}
              </h1>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 14 14"
                    fill="#f59e0b"
                  >
                    <path d="M7 1l1.8 3.6L13 5.3l-3 2.9.7 4.1L7 10.3l-3.7 1.9.7-4.1-3-2.9 4.2-.7z" />
                  </svg>
                  <span className="text-white font-bold text-sm">
                    {restaurant.rating
                      ? Number(restaurant.rating).toFixed(1)
                      : "New"}
                  </span>
                </div>
                <span className="text-white/40">•</span>
                <span className="text-white/70 text-sm">
                  {(restaurant as any).averageDeliveryMinutes || 20} min
                </span>
                <span className="text-white/40">•</span>
                <span
                  className={`text-sm font-bold ${
                    Number(deliveryFee) === 0
                      ? "text-[#92fc40]"
                      : "text-white/70"
                  }`}
                >
                  {Number(deliveryFee) === 0
                    ? "Free delivery"
                    : `₺${deliveryFee} delivery`}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CATEGORY TAB BAR — sticky */}
      <div className="sticky top-16 z-30 bg-white/80 dark:bg-[#1a1d2e]/80 backdrop-blur-[24px] border-b border-[rgba(0,4,53,0.06)] dark:border-[rgba(255,255,255,0.06)]">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex gap-0 overflow-x-auto no-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => scrollToCategory(cat)}
                className={cn(
                  "flex-shrink-0 px-5 py-4 text-sm font-bold transition-all border-b-2 whitespace-nowrap",
                  activeCategory === cat
                    ? "border-[#92fc40] text-[#101744] dark:text-[#e8eaf0]"
                    : "border-transparent text-[#5e5e5e] dark:text-[#9ba3b8] hover:text-[#101744] dark:hover:text-[#e8eaf0]",
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* INFO CARD & MAP */}
      <div className="max-w-5xl mx-auto px-4 mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          {restaurant.lat && restaurant.lng ? (
            <Map
              center={{
                lat: Number(restaurant.lat),
                lng: Number(restaurant.lng),
              }}
              markers={[
                {
                  lat: Number(restaurant.lat),
                  lng: Number(restaurant.lng),
                  color: "#E2103C",
                },
              ]}
              zoom={15}
              interactive={false}
              className="h-[200px] w-full rounded-2xl shadow-lg border border-[rgba(0,4,53,0.06)] dark:border-[rgba(255,255,255,0.06)]"
            />
          ) : (
            <div className="h-[200px] w-full bg-zinc-100 dark:bg-zinc-800 rounded-2xl flex items-center justify-center text-zinc-400">
              <MapPin className="w-8 h-8 opacity-20" />
            </div>
          )}
        </div>
        <div className="bg-white dark:bg-[#1e2235] p-6 rounded-2xl shadow-lg border border-[rgba(0,4,53,0.06)] dark:border-[rgba(255,255,255,0.06)] flex flex-col justify-center">
          <h3 className="font-bold text-lg text-[#101744] dark:text-[#e8eaf0] mb-2">
            Location
          </h3>
          <p className="text-sm text-zinc-500 mb-4">
            {restaurant.address || "Address not available"}
          </p>
          <div className="flex items-center gap-2 text-xs font-bold text-[#92fc40]">
            <div className="w-2 h-2 rounded-full bg-[#92fc40]" />
            Open until 11:00 PM
          </div>
        </div>
      </div>

      {/* MENU CONTENT */}
      <div className="max-w-5xl mx-auto px-4 pt-8">
        {categories.map((cat) => {
          const catItems = menu.filter(
            (item) => (item.category || "General") === cat,
          );
          return (
            <div
              key={cat}
              ref={(el) => {
                categoryRefs.current[cat] = el;
              }}
              className="mb-12"
            >
              {/* Category heading */}
              <div className="mb-6">
                <h2 className="text-[#101744] dark:text-[#e8eaf0] font-extrabold text-xl tracking-[-0.04em]">
                  {cat}
                </h2>
                <div className="h-[2px] w-8 bg-[#92fc40] mt-1" />
              </div>

              {/* Items grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {catItems.map((item) => {
                  const itemName =
                    (item.name as any)[locale] || (item.name as any)["tr"];
                  const itemDesc =
                    (item.description as any)[locale] ||
                    (item.description as any)["tr"] ||
                    "";

                  return (
                    <div
                      key={item.id}
                      className={cn(
                        "bg-white dark:bg-[#1e2235] rounded-[12px] shadow-[0_12px_24px_rgba(0,4,53,0.08)] overflow-hidden flex gap-0",
                      )}
                    >
                      {/* Image */}
                      <div className="w-[120px] flex-shrink-0 relative">
                        <img
                          src={
                            item.imageUrl ||
                            "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&auto=format&fit=crop"
                          }
                          alt={itemName}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* Content */}
                      <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
                        <div>
                          <h3 className="text-[#101744] dark:text-[#e8eaf0] font-bold text-[0.9375rem] leading-tight mb-1">
                            {itemName}
                          </h3>
                          {itemDesc && (
                            <p
                              className={cn(
                                "text-[#5e5e5e] dark:text-[#9ba3b8] text-xs leading-relaxed line-clamp-2",
                              )}
                            >
                              {itemDesc}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center justify-between mt-3">
                          <span className="text-[#92fc40] font-extrabold text-base">
                            ₺{Number(item.price).toFixed(2)}
                          </span>
                          <button
                            onClick={() => handleAddItem(item)}
                            className={cn(
                              "w-8 h-8 rounded-full bg-[#101744] dark:bg-[#92fc40] flex items-center justify-center hover:bg-[#1a2456] dark:hover:bg-[#77df1e] transition-colors active:scale-95",
                            )}
                          >
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 14 14"
                              fill="none"
                            >
                              <path
                                d="M7 2v10M2 7h10"
                                className="stroke-white dark:stroke-[#0b2000]"
                                strokeWidth="2"
                                strokeLinecap="round"
                              />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* STICKY CART BAR */}
      {totalItems > 0 && restaurantId === restaurant.id && (
        <div className="fixed bottom-0 left-0 w-full p-4 z-40 bg-white/80 dark:bg-[#1a1d2e]/80 backdrop-blur-[24px] border-t border-[rgba(0,4,53,0.06)] dark:border-[rgba(255,255,255,0.06)]">
          <div className="max-w-5xl mx-auto">
            <Link
              href="/checkout"
              className="flex items-center justify-between w-full h-[52px] px-5 rounded-full bg-[#101744] hover:bg-[#1a2456] transition-colors text-white shadow-md active:scale-[0.98]"
            >
              <div className="flex items-center gap-3">
                <div
                  className="bg-[#92fc40] text-[#0b2000] font-bold h-7 px-3 
                                rounded-full flex items-center justify-center text-sm"
                >
                  {totalItems}
                </div>
                <span className="font-bold text-[0.9375rem]">View Cart</span>
              </div>
              <span className="font-bold text-[0.9375rem]">
                ₺{totalPrice.toFixed(2)}
              </span>
            </Link>
          </div>
        </div>
      )}

      {/* MODIFIER MODAL */}
      {selectedItem && (
        <ModifierModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          locale={locale}
          restaurantId={restaurant.id}
          t={t}
          addItem={addItem}
          onAdded={() => showToast.success("Added to cart")}
        />
      )}
    </div>
  );
}

function ModifierModal({
  item,
  onClose,
  locale,
  restaurantId,
  t,
  addItem,
  onAdded,
}: {
  item: MenuItem;
  onClose: () => void;
  locale: string;
  restaurantId: string;
  t: any;
  addItem: any;
  onAdded: () => void;
}) {
  const itemName = (item.name as any)[locale] || (item.name as any)["tr"];
  const [selections, setSelections] = useState<Record<string, any[]>>({});

  const handleOptionToggle = (modGroup: any, option: any) => {
    const currentList = selections[modGroup.id] || [];
    const isSelected = currentList.some(
      (o) => (o.name as any).tr === (option.name as any).tr,
    );

    if (modGroup.maxSelections === 1) {
      setSelections({ ...selections, [modGroup.id]: [option] });
    } else {
      if (isSelected) {
        setSelections({
          ...selections,
          [modGroup.id]: currentList.filter(
            (o) => (o.name as any).tr !== (option.name as any).tr,
          ),
        });
      } else {
        if (currentList.length < modGroup.maxSelections) {
          setSelections({
            ...selections,
            [modGroup.id]: [...currentList, option],
          });
        }
      }
    }
  };

  const calculateItemTotal = () => {
    let total = Number(item.price);
    Object.values(selections).forEach((opts) => {
      opts.forEach((o) => {
        total += Number(o.price);
      });
    });
    return total;
  };

  const isFormValid = () => {
    return ((item.modifiers as any[]) || []).every((mod) => {
      if (!mod.required) return true;
      const count = (selections[mod.id] || []).length;
      return count > 0;
    });
  };

  const handleAddToCart = () => {
    if (!isFormValid()) return;

    const selectedMods: CartModifier[] = ((item.modifiers as any[]) || [])
      .filter((m) => selections[m.id] && selections[m.id].length > 0)
      .map((m) => ({
        id: m.id,
        name: m.name,
        selectedOptions: selections[m.id],
      }));

    addItem(restaurantId, {
      itemId: item.id,
      name: item.name,
      price: item.price,
      quantity: 1,
      selectedModifiers: selectedMods,
    });
    onAdded();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-[500px] bg-white dark:bg-[#1e2235] sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-5 border-b border-[rgba(0,4,53,0.06)] dark:border-[rgba(255,255,255,0.06)] flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-[#101744] dark:text-[#e8eaf0] truncate pr-4">
            {itemName}
          </h2>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center bg-[#f3f4f5] dark:bg-[#222536] text-[#101744] dark:text-[#e8eaf0] rounded-full transition-colors"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path
                d="M18 6L6 18M6 6l12 12"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {((item.modifiers as any[]) || []).map((mod) => {
            const modName =
              (mod.name as any)[locale] || (mod.name as any)["tr"];
            return (
              <div key={mod.id} className="mb-8 last:mb-0">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="font-bold text-base text-[#101744] dark:text-[#e8eaf0]">
                      {modName}
                    </h3>
                    <p className="text-xs text-[#5e5e5e] dark:text-[#9ba3b8] mt-0.5">
                      {t("maxSelections", { max: mod.maxSelections })}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider",
                      mod.required
                        ? "bg-[#92fc40]/10 text-[#0b2000] dark:text-[#92fc40]"
                        : "bg-[#edeeef] dark:bg-[#222536] text-[#5e5e5e] dark:text-[#9ba3b8]",
                    )}
                  >
                    {mod.required ? t("required") : t("optional")}
                  </span>
                </div>

                <div className="space-y-2">
                  {mod.options.map((opt: any, i: number) => {
                    const optName =
                      (opt.name as any)[locale] || (opt.name as any)["tr"];
                    const isSelected = (selections[mod.id] || []).some(
                      (o) => (o.name as any).tr === (opt.name as any).tr,
                    );

                    return (
                      <label
                        key={i}
                        className={cn(
                          "flex items-center justify-between p-4 border rounded-xl cursor-pointer transition-all",
                          isSelected
                            ? "border-[#92fc40] bg-[#92fc40]/5"
                            : "border-[rgba(0,4,53,0.06)] dark:border-[rgba(255,255,255,0.06)] bg-transparent",
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-5 h-5 flex items-center justify-center border transition-all ${
                              mod.maxSelections === 1
                                ? "rounded-full"
                                : "rounded"
                            } ${
                              isSelected
                                ? "border-[#92fc40] bg-[#92fc40]"
                                : "border-[#c7c5d0] dark:border-[#46464f] bg-transparent"
                            }`}
                          >
                            {isSelected && (
                              <svg
                                width="12"
                                height="12"
                                viewBox="0 0 12 12"
                                fill="none"
                              >
                                <path
                                  d="M10 3L4.5 8.5L2 6"
                                  stroke={
                                    mod.maxSelections === 1
                                      ? "#0b2000"
                                      : "#0b2000"
                                  }
                                  strokeWidth="2.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            )}
                          </div>
                          <span className="text-sm font-bold text-[#101744] dark:text-[#e8eaf0]">
                            {optName}
                          </span>
                        </div>
                        {opt.price > 0 && (
                          <span className="text-sm font-extrabold text-[#92fc40]">
                            +₺{Number(opt.price).toFixed(2)}
                          </span>
                        )}
                        <input
                          type="checkbox"
                          className="hidden"
                          checked={isSelected}
                          onChange={() => handleOptionToggle(mod, opt)}
                        />
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-5 border-t border-[rgba(0,4,53,0.06)] dark:border-[rgba(255,255,255,0.06)] bg-white dark:bg-[#1e2235] sm:rounded-b-2xl">
          <button
            onClick={handleAddToCart}
            disabled={!isFormValid()}
            className="w-full h-12 rounded-full bg-[#92fc40] text-[#0b2000] font-extrabold text-sm hover:bg-[#77df1e] transition-colors shadow-md disabled:bg-[#f3f4f5] dark:disabled:bg-[#222536] disabled:text-[#5e5e5e] disabled:shadow-none flex items-center justify-center"
          >
            {t("addToCart").replace(
              "{price}",
              `₺${calculateItemTotal().toFixed(2)}`,
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ClientMenu;
