import { db, promos, profiles, menuItems, orders } from "@shoplift/db";
import { eq, and, inArray, count } from "drizzle-orm";

export async function validatePromo(params: {
  code: string;
  userId: string;
  restaurantId: string;
  cartTotal: number;
  cartItemIds: string[];
}): Promise<{ valid: boolean; discount: number; message: string }> {
  try {
    // 1. Query promos
    const promoResult = await db
      .select()
      .from(promos)
      .where(and(eq(promos.code, params.code), eq(promos.isActive, true)))
      .limit(1);

    const promo = promoResult[0];

    if (!promo) {
      return { valid: false, discount: 0, message: "Invalid promo code" };
    }

    // 2. Check expiresAt
    if (promo.expiresAt && new Date(promo.expiresAt) < new Date()) {
      return { valid: false, discount: 0, message: "Promo code has expired" };
    }

    // 3. Check usage limit
    if ((promo.usedCount || 0) >= (promo.usageLimit || 0)) {
      return {
        valid: false,
        discount: 0,
        message: "Promo code usage limit reached",
      };
    }

    // 4. Restaurant match
    if (promo.restaurantId && promo.restaurantId !== params.restaurantId) {
      return {
        valid: false,
        discount: 0,
        message: "Promo not valid for this restaurant",
      };
    }

    // 5. Min order value
    if (
      promo.minOrderValue !== null &&
      params.cartTotal < Number(promo.minOrderValue)
    ) {
      return {
        valid: false,
        discount: 0,
        message: "Minimum order value not met",
      };
    }

    // 6. User limit
    const profileResult = await db
      .select({ usedPromoIds: profiles.usedPromoIds })
      .from(profiles)
      .where(eq(profiles.id, params.userId))
      .limit(1);

    const profile = profileResult[0];
    const usedPromoIds = (profile?.usedPromoIds as string[]) || [];
    const usageCount = usedPromoIds.filter((id) => id === promo.id).length;
    if (usageCount >= (promo.perUserLimit || 0)) {
      return {
        valid: false,
        discount: 0,
        message: "You have already used this promo code",
      };
    }

    let computedDiscount = 0;
    if (promo.type === "flat") {
      computedDiscount = Number(promo.value);
      if (promo.maxDiscount !== null) {
        computedDiscount = Math.min(
          computedDiscount,
          Number(promo.maxDiscount),
        );
      }
    } else if (promo.type === "percent") {
      computedDiscount = params.cartTotal * (Number(promo.value) / 100);
      if (promo.maxDiscount !== null) {
        computedDiscount = Math.min(
          computedDiscount,
          Number(promo.maxDiscount),
        );
      }
    } else if (promo.type === "freeDelivery") {
      computedDiscount = 30;
    } else if (promo.type === "bogo") {
      const eligibleItemIds = (promo.eligibleItemIds as string[]) || [];
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

      const items = await db
        .select({ price: menuItems.price })
        .from(menuItems)
        .where(inArray(menuItems.id, matchingIds));

      if (!items || items.length === 0) {
        return {
          valid: false,
          discount: 0,
          message: "No eligible items in cart for this promo",
        };
      }
      computedDiscount = Math.min(...items.map((i) => Number(i.price)));
    } else if (promo.type === "firstOrder") {
      const orderCountResult = await db
        .select({ value: count() })
        .from(orders)
        .where(
          and(
            eq(orders.customerId, params.userId),
            eq(orders.status, "DELIVERED"),
          ),
        );

      if (orderCountResult[0]?.value > 0) {
        return {
          valid: false,
          discount: 0,
          message: "This promo is only valid for first orders",
        };
      }
      computedDiscount = Number(promo.value);
      if (promo.maxDiscount !== null) {
        computedDiscount = Math.min(
          computedDiscount,
          Number(promo.maxDiscount),
        );
      }
    }

    return {
      valid: true,
      discount: computedDiscount,
      message: "Promo applied",
    };
  } catch (error: any) {
    console.error("Promo validation error:", error);
    return { valid: false, discount: 0, message: "Error validating promo" };
  }
}
