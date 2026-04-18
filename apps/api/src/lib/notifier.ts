interface NewOrderPayload {
  orderId: string;
  restaurantId: string;
  restaurantName: string;
  restaurantEmail: string;
  customerName: string;
  items: any[];
  total: number;
}

interface OrderStatusPayload {
  orderId: string;
  customerId: string;
  customerEmail: string;
  customerName: string;
  restaurantName: string;
  newStatus: string;
  estimatedTime?: string;
}

interface MarketingPayload {
  customerEmail: string;
  customerName: string;
  promoCode: string;
}

const N8N_WEBHOOK_BASE_URL =
  process.env.N8N_WEBHOOK_BASE_URL ||
  (process.env.NODE_ENV === "development"
    ? "http://localhost:5678/webhook"
    : "http://n8n:5678/webhook");

const shouldSkipWebhookInDev =
  process.env.NODE_ENV === "development" && !process.env.N8N_WEBHOOK_BASE_URL;

/**
 * Sends a notification to n8n for a new order.
 */
export async function notifyNewOrder(payload: NewOrderPayload) {
  if (shouldSkipWebhookInDev) return;
  try {
    const url = `${N8N_WEBHOOK_BASE_URL}/new-order`;
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch((err) =>
      console.error("Error calling n8n new-order webhook:", err),
    );
  } catch (error) {
    console.error("notifyNewOrder failed (suppressed):", error);
  }
}

/**
 * Sends a notification to n8n for an order status change.
 */
export async function notifyOrderStatusChange(payload: OrderStatusPayload) {
  if (shouldSkipWebhookInDev) return;
  try {
    const url = `${N8N_WEBHOOK_BASE_URL}/order-status`;
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch((err) =>
      console.error("Error calling n8n order-status webhook:", err),
    );
  } catch (error) {
    console.error("notifyOrderStatusChange failed (suppressed):", error);
  }
}

/**
 * Sends a marketing notification to n8n.
 */
export async function notifyMarketing(payload: MarketingPayload) {
  if (shouldSkipWebhookInDev) return;
  try {
    const url = `${N8N_WEBHOOK_BASE_URL}/marketing`;
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch((err) =>
      console.error("Error calling n8n marketing webhook:", err),
    );
  } catch (error) {
    console.error("notifyMarketing failed (suppressed):", error);
  }
}
