"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useTranslations } from "next-intl";

export interface CartModifierOption {
  name: { tr: string; en: string };
  price: number;
}

export interface CartModifier {
  id: string;
  name: { tr: string; en: string };
  selectedOptions: CartModifierOption[];
}

export interface OmitCartItemId {
  itemId: string;
  name: { tr: string; en: string };
  price: number;
  quantity: number;
  selectedModifiers: CartModifier[];
}

export interface CartItem extends OmitCartItemId {
  id: string; // unique cart instance id
}

interface CartContextType {
  restaurantId: string | null;
  items: CartItem[];
  addItem: (restaurantId: string, item: OmitCartItemId) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, newQuantity: number) => void;
  clearCart: () => void;
  totalPrice: number;
  totalItems: number;
  isDifferentRestaurantModalOpen: boolean;
  cancelAddDifferentRestaurant: () => void;
  confirmAddDifferentRestaurant: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const t = useTranslations("restaurants");
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Different restaurant modal state
  const [isDifferentRestaurantModalOpen, setDifferentModalOpen] =
    useState(false);
  const [pendingItem, setPendingItem] = useState<{
    restaurantId: string;
    item: OmitCartItemId;
  } | null>(null);

  // Load from sessionStorage
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem("shoplift_cart");
      if (stored) {
        const parsed = JSON.parse(stored);
        setRestaurantId(parsed.restaurantId || null);
        setItems(parsed.items || []);
      }
    } catch (e) {
      console.error("Failed to load cart from session storage", e);
    }
    setIsLoaded(true);
  }, []);

  // Save to sessionStorage
  useEffect(() => {
    if (isLoaded) {
      sessionStorage.setItem(
        "shoplift_cart",
        JSON.stringify({ restaurantId, items }),
      );
    }
  }, [restaurantId, items, isLoaded]);

  const addItem = (newRestaurantId: string, item: OmitCartItemId) => {
    if (restaurantId && restaurantId !== newRestaurantId && items.length > 0) {
      // Need confirmation
      setPendingItem({ restaurantId: newRestaurantId, item });
      setDifferentModalOpen(true);
      return;
    }

    // Assign generic ID
    const cartItemId = crypto.randomUUID();
    const newItem = { ...item, id: cartItemId };

    setRestaurantId(newRestaurantId);
    setItems((prev) => [...prev, newItem]);
  };

  const confirmAddDifferentRestaurant = () => {
    if (pendingItem) {
      // Clear old cart and add new
      const cartItemId = crypto.randomUUID();
      const newItem = { ...pendingItem.item, id: cartItemId };
      setRestaurantId(pendingItem.restaurantId);
      setItems([newItem]);
    }
    setDifferentModalOpen(false);
    setPendingItem(null);
  };

  const cancelAddDifferentRestaurant = () => {
    setDifferentModalOpen(false);
    setPendingItem(null);
  };

  const removeItem = (id: string) => {
    setItems((prev) => {
      const next = prev.filter((i) => i.id !== id);
      if (next.length === 0) setRestaurantId(null);
      return next;
    });
  };

  const updateQuantity = (id: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeItem(id);
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, quantity: newQuantity } : i)),
    );
  };

  const clearCart = () => {
    setRestaurantId(null);
    setItems([]);
  };

  const totalPrice = items.reduce((acc, current) => {
    let itemBasePrice = current.price;
    current.selectedModifiers.forEach((mod) => {
      mod.selectedOptions.forEach((opt) => {
        itemBasePrice += opt.price;
      });
    });
    return acc + itemBasePrice * current.quantity;
  }, 0);

  const totalItems = items.reduce((acc, current) => acc + current.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        restaurantId,
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        totalPrice,
        totalItems,
        isDifferentRestaurantModalOpen,
        cancelAddDifferentRestaurant,
        confirmAddDifferentRestaurant,
      }}
    >
      {children}
      {/* Global Confirmation Modal */}
      {isLoaded && isDifferentRestaurantModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-[340px] p-6 shadow-xl">
            <h3 className="text-xl font-bold text-zinc-900 mb-2">
              {t("clearCartTitle")}
            </h3>
            <p className="text-sm text-zinc-600 mb-6">
              {t("clearCartMessage")}
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={confirmAddDifferentRestaurant}
                className="w-full h-12 rounded-full bg-[#E2103C] text-white font-bold text-sm"
              >
                {t("clearCartConfirm")}
              </button>
              <button
                onClick={cancelAddDifferentRestaurant}
                className="w-full h-12 rounded-full bg-zinc-100 text-zinc-900 font-bold text-sm"
              >
                {t("cancel")}
              </button>
            </div>
          </div>
        </div>
      )}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};
