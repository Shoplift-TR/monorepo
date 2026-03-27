import TelegramBot from "node-telegram-bot-api";
import { Resend } from "resend";
import { supabase } from "./supabase.js";

const bot = process.env.TELEGRAM_BOT_TOKEN
  ? new TelegramBot(process.env.TELEGRAM_BOT_TOKEN)
  : null;

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const SUPER_ADMIN_CHAT_ID = process.env.TELEGRAM_SUPER_ADMIN_CHAT_ID;

interface OrderNotificationPayload {
  orderId: string;
  restaurantId: string;
  restaurantName: string;
  restaurantEmail: string;
  customerName: string;
  customerEmail: string;
  items: {
    name: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }[];
  subtotal: number;
  deliveryFee: number;
  discount: number;
  platformFee: number;
  total: number;
  promoCode?: string;
  deliveryAddress: string;
  notes?: string;
  createdAt: string;
}

function formatOrderMessage(payload: OrderNotificationPayload): string {
  const itemsList = payload.items
    .map((i) => `  • ${i.quantity}x ${i.name} — ₺${i.lineTotal.toFixed(2)}`)
    .join("\n");

  return `
🆕 NEW ORDER — #${payload.orderId.slice(0, 8).toUpperCase()}

🏪 Restaurant: ${payload.restaurantName}
👤 Customer: ${payload.customerName}
📍 Delivery: ${payload.deliveryAddress}
${payload.notes ? `📝 Notes: ${payload.notes}` : ""}

📦 Items:
${itemsList}

💰 Breakdown:
  Subtotal: ₺${payload.subtotal.toFixed(2)}
  Platform Fee: ₺${payload.platformFee.toFixed(2)}
  Delivery Fee: ₺${payload.deliveryFee.toFixed(2)}
  ${payload.discount > 0 ? `Discount: -₺${payload.discount.toFixed(2)}` : ""}
  
  TOTAL: ₺${payload.total.toFixed(2)}

🕐 ${new Date(payload.createdAt).toLocaleString("tr-TR")}
`.trim();
}

function formatOrderEmailHtml(payload: OrderNotificationPayload): string {
  const itemsHtml = payload.items
    .map(
      (i) => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #f0f0f0;">
          ${i.quantity}x ${i.name}
        </td>
        <td style="padding:8px;border-bottom:1px solid #f0f0f0;text-align:right;">
          ₺${i.lineTotal.toFixed(2)}
        </td>
      </tr>`,
    )
    .join("");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Plus Jakarta Sans', Arial, sans-serif; 
           background: #f8f9fa; margin: 0; padding: 20px; }
    .card { background: white; border-radius: 12px; padding: 32px; 
            max-width: 560px; margin: 0 auto; }
    .header { background: #101744; color: white; border-radius: 8px; 
              padding: 16px 24px; margin-bottom: 24px; }
    .order-id { color: #92fc40; font-size: 0.75rem; 
                font-weight: bold; text-transform: uppercase; }
    table { width: 100%; border-collapse: collapse; }
    .total-row td { font-weight: bold; font-size: 1.1rem; 
                    padding: 12px 8px; border-top: 2px solid #101744; }
    .label { color: #5e5e5e; font-size: 0.75rem; 
             text-transform: uppercase; letter-spacing: 0.05em; }
    .value { color: #101744; font-weight: 600; }
    .platform-fee { color: #92fc40; }
    .footer { margin-top: 24px; color: #9ba3b8; font-size: 0.75rem; 
              text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="order-id">
        New Order — #${payload.orderId.slice(0, 8).toUpperCase()}
      </div>
      <div style="font-size:1.25rem;font-weight:800;margin-top:4px;">
        Shoplift Order Notification
      </div>
    </div>

    <table>
      <tr>
        <td class="label">Restaurant</td>
        <td class="value">${payload.restaurantName}</td>
      </tr>
      <tr>
        <td class="label">Customer</td>
        <td class="value">${payload.customerName}</td>
      </tr>
      <tr>
        <td class="label">Delivery Address</td>
        <td class="value">${payload.deliveryAddress}</td>
      </tr>
      ${
        payload.notes
          ? `
      <tr>
        <td class="label">Notes</td>
        <td class="value">${payload.notes}</td>
      </tr>`
          : ""
      }
      <tr>
        <td class="label">Order Time</td>
        <td class="value">
          ${new Date(payload.createdAt).toLocaleString("tr-TR")}
        </td>
      </tr>
    </table>

    <h3 style="margin-top:24px;color:#101744;">Order Items</h3>
    <table>
      ${itemsHtml}
      <tr>
        <td style="padding:8px;color:#5e5e5e;">Subtotal</td>
        <td style="padding:8px;text-align:right;">
          ₺${payload.subtotal.toFixed(2)}
        </td>
      </tr>
      <tr>
        <td style="padding:8px;color:#5e5e5e;">
          Platform Fee
        </td>
        <td style="padding:8px;text-align:right;color:#101744;">
          ₺${payload.platformFee.toFixed(2)}
        </td>
      </tr>
      <tr>
        <td style="padding:8px;color:#5e5e5e;">Delivery Fee</td>
        <td style="padding:8px;text-align:right;">
          ₺${payload.deliveryFee.toFixed(2)}
        </td>
      </tr>
      ${
        payload.discount > 0
          ? `
      <tr>
        <td style="padding:8px;color:#5e5e5e;">Discount</td>
        <td style="padding:8px;text-align:right;color:#10b981;">
          -₺${payload.discount.toFixed(2)}
        </td>
      </tr>`
          : ""
      }
      <tr class="total-row">
        <td>Total</td>
        <td style="text-align:right;">₺${payload.total.toFixed(2)}</td>
      </tr>
    </table>

    <div class="footer">
      Shoplift — Campus Food Delivery Platform
    </div>
  </div>
</body>
</html>`;
}

export async function sendOrderNotifications(
  payload: OrderNotificationPayload,
): Promise<void> {
  const message = formatOrderMessage(payload);
  const emailHtml = formatOrderEmailHtml(payload);

  const tasks: Promise<any>[] = [];

  // 1. Telegram to super admin group
  if (bot && SUPER_ADMIN_CHAT_ID) {
    tasks.push(
      bot
        .sendMessage(SUPER_ADMIN_CHAT_ID, message, {})
        .catch((err: any) =>
          console.error("Telegram super admin notification failed:", err),
        ),
    );
  }

  // 2. Telegram to restaurant admin (if they have a chat ID registered)
  if (bot && payload.restaurantId) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("telegram_chat_id")
      .eq("restaurant_id", payload.restaurantId)
      .eq("role", "restaurant_admin")
      .maybeSingle();

    if (profile?.telegram_chat_id) {
      tasks.push(
        bot
          .sendMessage(profile.telegram_chat_id, message, {
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: "✅ Confirm",
                    callback_data: `confirm:${payload.orderId}`,
                  },
                  {
                    text: "❌ Reject",
                    callback_data: `reject:${payload.orderId}`,
                  },
                ],
              ],
            },
          })
          .catch((err: any) =>
            console.error(
              "Telegram restaurant admin notification failed:",
              err,
            ),
          ),
      );
    }
  }

  // 3. Email to restaurant admin
  if (resend && payload.restaurantEmail) {
    tasks.push(
      resend.emails
        .send({
          from: process.env.RESEND_FROM || "onboarding@resend.dev",
          to: payload.restaurantEmail,
          subject: `New Order #${payload.orderId.slice(0, 8).toUpperCase()} — ${payload.restaurantName}`,
          html: emailHtml,
        })
        .catch((err: any) =>
          console.error("Resend restaurant email failed:", err),
        ),
    );
  }

  // 4. Email to super admins
  if (resend) {
    const { data: superAdmins } = await supabase
      .from("profiles")
      .select("email")
      .eq("role", "super_admin");

    if (superAdmins && superAdmins.length > 0) {
      const superAdminEmails = superAdmins.map((a: any) => a.email);
      tasks.push(
        resend.emails
          .send({
            from: process.env.RESEND_FROM || "onboarding@resend.dev",
            to: superAdminEmails,
            subject: `[Platform] New Order #${payload.orderId
              .slice(0, 8)
              .toUpperCase()} — ${payload.restaurantName}`,
            html: emailHtml,
          })
          .catch((err: any) =>
            console.error("Resend super admin email failed:", err),
          ),
      );
    }
  }

  await Promise.allSettled(tasks);
}
