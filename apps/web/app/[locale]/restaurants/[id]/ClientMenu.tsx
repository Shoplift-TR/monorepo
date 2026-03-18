"use client";

import React, { useState, useMemo } from "react";
import { Restaurant, MenuItem } from "@shoplift/types";
import { useTranslations } from "next-intl";
import {
  useCart,
  CartModifier,
  CartModifierOption,
} from "@/contexts/CartContext";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface ClientMenuProps {
  restaurant: Restaurant;
  menu: MenuItem[];
  locale: string;
}

export function ClientMenu({ restaurant, menu, locale }: ClientMenuProps) {
  const t = useTranslations("restaurants");
  const { addItem, totalItems, totalPrice, restaurantId } = useCart();
  const router = useRouter();

  const name =
    (restaurant.name as any)[locale] || restaurant.name["tr"] || "Restaurant";
  const desc =
    (restaurant.description as any)[locale] ||
    restaurant.description["tr"] ||
    "";

  // Group menu by categories
  const categories = useMemo(() => {
    const cats = new Set(menu.map((i) => i.category || "General"));
    return Array.from(cats);
  }, [menu]);

  const [activeCategory, setActiveCategory] = useState(categories[0] || "");
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);

  // Auto-scroll to category logic
  const scrollToCategory = (category: string) => {
    setActiveCategory(category);
    const element = document.getElementById(`cat-${category}`);
    if (element) {
      const y = element.getBoundingClientRect().top + window.scrollY - 150;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };

  const handleOpenModifiers = (item: MenuItem) => {
    if (!item.modifiers || item.modifiers.length === 0) {
      // Add instantly
      addItem(restaurant.id, {
        itemId: item.id,
        name: item.name,
        price: item.price,
        quantity: 1,
        selectedModifiers: [],
      });
      return;
    }
    setSelectedItem(item);
  };

  return (
    <div className="min-h-screen bg-zinc-50 pb-32">
      {/* Header section (Yemeksepeti style white background with bottom border) */}
      <div className="bg-white px-4 pt-4 pb-4 shadow-sm relative sticky top-0 md:static z-20">
        <div className="flex gap-4 items-center">
          <div className="w-16 h-16 bg-zinc-100 rounded-lg overflow-hidden border border-zinc-200 shadow-sm shrink-0">
            <img
              src={
                restaurant.logo ||
                "https://placehold.co/200x200/eee/999?text=Logo"
              }
              alt={name}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl font-bold text-zinc-900 leading-tight">
              {name}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[#FFB800] text-sm">★</span>
              <span className="text-sm font-bold text-zinc-800">
                {restaurant.rating?.toFixed(1) || "New"}
              </span>
              <span className="text-zinc-400 text-xs">
                ({restaurant.totalOrders}+ orders)
              </span>
            </div>
            <p className="text-sm text-zinc-500 mt-1 line-clamp-2 leading-snug">
              {desc}
            </p>
          </div>
        </div>
      </div>

      {/* Categories Tabs - Sticky below navigation */}
      <div className="sticky top-[73px] bg-white border-b border-zinc-200 z-10 shadow-sm w-full">
        <div className="flex overflow-x-auto no-scrollbar items-center gap-6 px-4 h-14">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => scrollToCategory(cat)}
              className={`whitespace-nowrap font-bold text-sm tracking-tight border-b-2 h-full transition-colors ${
                activeCategory === cat
                  ? "border-[#E2103C] text-[#E2103C]"
                  : "border-transparent text-zinc-500 hover:text-zinc-800"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Menu List */}
      <div className="w-full max-w-[500px] mx-auto bg-white min-h-screen">
        {categories.map((cat) => (
          <div key={cat} id={`cat-${cat}`} className="pt-6">
            <h3 className="px-4 text-xl font-bold tracking-tight text-zinc-900 mb-4">
              {cat}
            </h3>
            <div className="flex flex-col border-t border-zinc-100">
              {menu
                .filter((item) => (item.category || "General") === cat)
                .map((item) => {
                  const itemName =
                    (item.name as any)[locale] || item.name["tr"];
                  const itemDesc =
                    (item.description as any)[locale] ||
                    item.description["tr"] ||
                    "";

                  return (
                    <div
                      key={item.id}
                      className="flex p-4 border-b border-zinc-100 hover:bg-zinc-50 transition-colors"
                    >
                      <div className="flex-1 pr-4">
                        <h4 className="font-bold text-[15px] text-zinc-900 mb-1">
                          {itemName}
                        </h4>
                        {itemDesc && (
                          <p className="text-[13px] text-zinc-500 line-clamp-2 leading-relaxed mb-2">
                            {itemDesc}
                          </p>
                        )}
                        <div className="font-bold text-[#E2103C] mt-2">
                          ₺{item.price.toFixed(2)}
                        </div>
                      </div>
                      <div className="w-[100px] shrink-0 flex flex-col items-center justify-between">
                        <div className="w-full aspect-square bg-zinc-100 rounded-xl overflow-hidden mb-2 shadow-[0_2px_8px_rgba(0,0,0,0.06)] relative border border-zinc-100">
                          <img
                            src={
                              item.imageUrl ||
                              "https://placehold.co/200x200/fafafa/999?text=Item"
                            }
                            alt={itemName}
                            className="w-full h-full object-cover mix-blend-multiply"
                          />
                        </div>
                        <button
                          onClick={() => handleOpenModifiers(item)}
                          className="w-full h-8 flex items-center justify-center bg-white border border-[#E2103C] text-[#E2103C] font-bold text-xs rounded-full hover:bg-[#FFF0F3] active:bg-[#FFE3E8] transition-colors shadow-sm"
                        >
                          + {t("addToCart").replace("{price}", "")}
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        ))}
      </div>

      {/* Sticky View Cart Footer */}
      {totalItems > 0 && restaurantId === restaurant.id && (
        <div className="fixed bottom-0 left-0 w-full bg-white border-t border-zinc-200 p-4 shadow-[0_-4px_16px_rgba(0,0,0,0.05)] z-40 transform translate-y-0 transition-transform md:max-w-[500px] md:left-1/2 md:-translate-x-1/2 md:pb-6">
          <Link
            href={`/${locale}/checkout`}
            className="flex items-center justify-between w-full h-[52px] px-5 rounded-full bg-[#E2103C] hover:bg-[#cc0d35] transition-colors text-white shadow-md active:scale-[0.98]"
          >
            <div className="flex items-center gap-3">
              <div className="bg-white/20 text-white font-bold h-7 px-3 rounded-full flex items-center justify-center text-sm">
                {totalItems}
              </div>
              <span className="font-bold text-[15px]">{t("viewCart")}</span>
            </div>
            <span className="font-bold text-[15px]">
              ₺{totalPrice.toFixed(2)}
            </span>
          </Link>
        </div>
      )}

      {/* Modifier Modal */}
      {selectedItem && (
        <ModifierModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          locale={locale}
          restaurantId={restaurant.id}
          t={t}
          addItem={addItem}
        />
      )}
    </div>
  );
}

// Separate component for Modifier Modal
function ModifierModal({
  item,
  onClose,
  locale,
  restaurantId,
  t,
  addItem,
}: {
  item: MenuItem;
  onClose: () => void;
  locale: string;
  restaurantId: string;
  t: any;
  addItem: any;
}) {
  const itemName = (item.name as any)[locale] || item.name["tr"];

  // State maps modifier_group_id -> array of selected options
  const [selections, setSelections] = useState<Record<string, any[]>>({});

  const handleOptionToggle = (modGroup: any, option: any) => {
    const currentList = selections[modGroup.id] || [];
    const isSelected = currentList.some((o) => o.name.tr === option.name.tr);

    if (modGroup.maxSelections === 1) {
      // Radio swap
      setSelections({ ...selections, [modGroup.id]: [option] });
    } else {
      if (isSelected) {
        setSelections({
          ...selections,
          [modGroup.id]: currentList.filter(
            (o) => o.name.tr !== option.name.tr,
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
    let total = item.price;
    Object.values(selections).forEach((opts) => {
      opts.forEach((o) => {
        total += o.price;
      });
    });
    return total;
  };

  const isFormValid = () => {
    return (item.modifiers || []).every((mod) => {
      if (!mod.required) return true;
      const count = (selections[mod.id] || []).length;
      return count > 0;
    });
  };

  const handleAddToCart = () => {
    if (!isFormValid()) return;

    // Create CartModifier array
    const selectedMods: CartModifier[] = (item.modifiers || [])
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
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-[500px] bg-white sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 border-b border-zinc-100 flex items-center justify-between shrink-0">
          <h2 className="text-lg font-bold text-zinc-900 truncate pr-4">
            {itemName}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center bg-zinc-100 hover:bg-zinc-200 rounded-full shrink-0 transition-colors"
          >
            ×
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto w-full pb-4">
          {(item.modifiers || []).map((mod) => {
            const modName = (mod.name as any)[locale] || mod.name["tr"];
            const selectedCount = (selections[mod.id] || []).length;

            return (
              <div
                key={mod.id}
                className="w-full border-b border-zinc-100 pb-4 last:border-0 pt-4 px-4 bg-white"
              >
                <div className="flex justify-between items-baseline mb-3">
                  <h3 className="font-bold text-[16px] text-zinc-900 leading-tight">
                    {modName}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-sm ${
                        mod.required
                          ? "bg-[#FFF0F3] text-[#E2103C]"
                          : "bg-zinc-100 text-zinc-500"
                      }`}
                    >
                      {mod.required ? t("required") : t("optional")}
                    </span>
                  </div>
                </div>
                <div className="mb-3">
                  <p className="text-xs text-zinc-500 font-medium">
                    {t("maxSelections", { max: mod.maxSelections })}
                  </p>
                </div>

                <div className="flex flex-col">
                  {mod.options.map((opt, i) => {
                    const optName = (opt.name as any)[locale] || opt.name["tr"];
                    const isSelected = (selections[mod.id] || []).some(
                      (o) => o.name.tr === opt.name.tr,
                    );

                    return (
                      <label
                        key={i}
                        className="flex items-center justify-between p-3 border border-zinc-200 rounded-xl cursor-pointer hover:bg-zinc-50/50 mb-2 last:mb-0 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-5 h-5 flex items-center justify-center border transition-colors ${
                              mod.maxSelections === 1
                                ? "rounded-full"
                                : "rounded"
                            } ${
                              isSelected
                                ? "border-[#E2103C] bg-[#E2103C]"
                                : "border-zinc-300 bg-white"
                            }`}
                          >
                            {isSelected && (
                              <svg
                                className="w-3 h-3 text-white"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={3}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            )}
                          </div>
                          <span className="text-[15px] font-medium text-zinc-800">
                            {optName}
                          </span>
                        </div>
                        {opt.price > 0 && (
                          <span className="text-sm font-medium text-zinc-500">
                            +₺{opt.price.toFixed(2)}
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Footer (Sticky) */}
        <div className="p-4 border-t border-zinc-200 bg-white sm:rounded-b-2xl shrink-0">
          <button
            onClick={handleAddToCart}
            disabled={!isFormValid()}
            className="w-full h-[52px] rounded-full bg-[#E2103C] text-white font-bold text-[15px] hover:bg-[#cc0d35] active:bg-[#a60b2b] transition-colors shadow-md disabled:bg-zinc-300 disabled:text-zinc-500 disabled:shadow-none flex items-center justify-center"
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
