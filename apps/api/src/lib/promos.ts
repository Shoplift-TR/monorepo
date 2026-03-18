import { supabase } from "../lib/supabase.js";

export async function validatePromo(params: {
  code: string;
  userId: string;
  restaurantId: string;
  cartTotal: number;
  cartItemIds: string[];
}): Promise<{ valid: boolean; discount: number; message: string }> {
  // 1. Query promos
  const { data: promo, error } = await supabase
    .from("promos")
    .select("*")
    .eq("code", params.code)
    .eq("is_active", true)
    .single();

  if (error || !promo) {
    return { valid: false, discount: 0, message: "Invalid promo code" };
  }

  // 2. Check expires_at
  if (new Date(promo.expires_at) < new Date()) {
    return { valid: false, discount: 0, message: "Promo code has expired" };
  }

  // 3. Check usage limit
  if (promo.used_count >= promo.usage_limit) {
    return {
      valid: false,
      discount: 0,
      message: "Promo code usage limit reached",
    };
  }

  // 4. Restaurant match
  if (promo.restaurant_id && promo.restaurant_id !== params.restaurantId) {
    return {
      valid: false,
      discount: 0,
      message: "Promo not valid for this restaurant",
    };
  }

  // 5. Min order value
  if (
    promo.min_order_value !== null &&
    params.cartTotal < Number(promo.min_order_value)
  ) {
    return {
      valid: false,
      discount: 0,
      message: "Minimum order value not met",
    };
  }

  // 6. User limit
  const { data: profile } = await supabase
    .from("profiles")
    .select("used_promo_ids")
    .eq("id", params.userId)
    .single();

  const usedPromoIds = profile?.used_promo_ids || [];
  const count = usedPromoIds.filter((id: string) => id === promo.id).length;
  if (count >= promo.per_user_limit) {
    return {
      valid: false,
      discount: 0,
      message: "You have already used this promo code",
    };
  }

  let computedDiscount = 0;
  if (promo.type === "flat") {
    computedDiscount = Number(promo.value);
    if (promo.max_discount !== null) {
      computedDiscount = Math.min(computedDiscount, Number(promo.max_discount));
    }
  } else if (promo.type === "percent") {
    computedDiscount = params.cartTotal * (Number(promo.value) / 100);
    if (promo.max_discount !== null) {
      computedDiscount = Math.min(computedDiscount, Number(promo.max_discount));
    }
  } else if (promo.type === "freeDelivery") {
    computedDiscount = 30;
  } else if (promo.type === "bogo") {
    const eligibleItemIds = promo.eligible_item_ids || [];
    const matchingIds = params.cartItemIds.filter((id) =>
      eligibleItemIds.includes(id),
    );
    if (matchingIds.length === 0) {
      return {
        valid: false,
        discount: 0,
        message: "No eligible items in cart for this promo",
      };
    }
    const { data: items } = await supabase
      .from("menu_items")
      .select("price")
      .in("id", matchingIds);
    if (!items || items.length === 0) {
      return {
        valid: false,
        discount: 0,
        message: "No eligible items in cart for this promo",
      };
    }
    computedDiscount = Math.min(...items.map((i) => Number(i.price)));
  } else if (promo.type === "firstOrder") {
    const { data: orders } = await supabase
      .from("orders")
      .select("id")
      .eq("customer_id", params.userId)
      .eq("status", "DELIVERED")
      .limit(1);
    if (orders && orders.length > 0) {
      return {
        valid: false,
        discount: 0,
        message: "This promo is only valid for first orders",
      };
    }
    computedDiscount = Number(promo.value);
    if (promo.max_discount !== null) {
      computedDiscount = Math.min(computedDiscount, Number(promo.max_discount));
    }
  }

  return { valid: true, discount: computedDiscount, message: "Promo applied" };
}
