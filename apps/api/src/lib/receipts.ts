import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { db, receipts, orders, restaurants } from "@shoplift/db";
import { eq } from "drizzle-orm";
import { supabase } from "./supabase.js";
import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

// Cache the font buffer in memory
let fontBuffer: ArrayBuffer | null = null;

async function getFont() {
  if (fontBuffer) return fontBuffer;
  const url =
    "https://github.com/google/fonts/raw/main/ofl/inter/Inter-Regular.ttf";
  const response = await fetch(url);
  fontBuffer = await response.arrayBuffer();
  return fontBuffer;
}

export async function generateReceiptPng(orderId: string): Promise<Buffer> {
  const orderResult = await db
    .select()
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);
  const order = orderResult[0];
  if (!order) throw new Error("Order not found");

  const restaurantResult = await db
    .select()
    .from(restaurants)
    .where(eq(restaurants.id, order.restaurantId))
    .limit(1);
  const restaurant = restaurantResult[0];
  if (!restaurant) throw new Error("Restaurant not found");

  const fontData = await getFont();

  const svg = await satori(
    {
      type: "div",
      props: {
        style: {
          display: "flex",
          flexDirection: "column",
          width: "100%",
          padding: "40px",
          backgroundColor: "#ffffff",
          fontFamily: "Inter",
          color: "#000000",
        },
        children: [
          // Header
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "40px",
              },
              children: [
                {
                  type: "div",
                  props: {
                    style: {
                      fontSize: "32px",
                      fontWeight: "bold",
                      color: "#E2103C",
                    },
                    children: "Shoplift",
                  },
                },
                {
                  type: "div",
                  props: {
                    style: { fontSize: "16px", color: "#666" },
                    children: `Order #${order.id.slice(0, 8)}`,
                  },
                },
              ],
            },
          },
          // Restaurant Name
          {
            type: "div",
            props: {
              style: {
                fontSize: "24px",
                fontWeight: "bold",
                marginBottom: "8px",
              },
              children:
                (restaurant.name as any).en ||
                (restaurant.name as any).tr ||
                "Restaurant",
            },
          },
          // Items
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                marginBottom: "24px",
              },
              children: (order.items as any[]).map((item) => ({
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "14px",
                  },
                  children: [
                    {
                      type: "span",
                      props: {
                        children: `${item.quantity}x ${(item.name as any).en || (item.name as any).tr}`,
                      },
                    },
                    {
                      type: "span",
                      props: {
                        children: `₺${(item.subtotal / 100).toFixed(2)}`,
                      },
                    },
                  ],
                },
              })),
            },
          },
          // Totals
          {
            type: "div",
            props: {
              style: {
                borderTop: "1px solid #eee",
                paddingTop: "12px",
                display: "flex",
                flexDirection: "column",
                gap: "4px",
              },
              children: [
                {
                  type: "div",
                  props: {
                    style: {
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "14px",
                      color: "#666",
                    },
                    children: [
                      { type: "span", props: { children: "Subtotal" } },
                      {
                        type: "span",
                        props: {
                          children: `₺${(order.subtotal / 100).toFixed(2)}`,
                        },
                      },
                    ],
                  },
                },
                {
                  type: "div",
                  props: {
                    style: {
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "14px",
                      color: "#666",
                    },
                    children: [
                      { type: "span", props: { children: "Delivery Fee" } },
                      {
                        type: "span",
                        props: {
                          children: `₺${(order.deliveryFee / 100).toFixed(2)}`,
                        },
                      },
                    ],
                  },
                },
                order.discountAmount && order.discountAmount > 0
                  ? {
                      type: "div",
                      props: {
                        style: {
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: "14px",
                          color: "green",
                        },
                        children: [
                          { type: "span", props: { children: "Discount" } },
                          {
                            type: "span",
                            props: {
                              children: `-₺${(order.discountAmount / 100).toFixed(2)}`,
                            },
                          },
                        ],
                      },
                    }
                  : null,
                {
                  type: "div",
                  props: {
                    style: {
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "18px",
                      fontWeight: "bold",
                      marginTop: "12px",
                    },
                    children: [
                      { type: "span", props: { children: "Total" } },
                      {
                        type: "span",
                        props: {
                          children: `₺${(order.total / 100).toFixed(2)}`,
                        },
                      },
                    ],
                  },
                },
              ].filter(Boolean),
            },
          },
          // Footer
          {
            type: "div",
            props: {
              style: {
                marginTop: "40px",
                fontSize: "12px",
                color: "#999",
                textAlign: "center",
              },
              children: "Thank you for shopping with Shoplift!",
            },
          },
        ],
      },
    } as any,
    {
      width: 600,
      height: 800,
      fonts: [
        {
          name: "Inter",
          data: fontData,
          weight: 400,
          style: "normal",
        },
      ],
    },
  );

  const resvg = new Resvg(svg, { background: "rgba(255, 255, 255, 1)" });
  const pngData = resvg.render();
  return pngData.asPng();
}

export async function processReceipt(orderId: string) {
  try {
    // 1. Check if receipt already exists (idempotency)
    const existingResult = await db
      .select()
      .from(receipts)
      .where(eq(receipts.orderId, orderId))
      .limit(1);
    if (existingResult.length > 0 && existingResult[0].status === "generated") {
      console.log(`Receipt for order ${orderId} already exists, skipping.`);
      return;
    }

    // 2. Generate PNG
    const pngBuffer = await generateReceiptPng(orderId);

    // 3. Upload to Supabase Storage
    const fileName = `receipt_${orderId}.png`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("receipts")
      .upload(fileName, pngBuffer, {
        contentType: "image/png",
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const {
      data: { publicUrl },
    } = supabase.storage.from("receipts").getPublicUrl(fileName);

    // 4. Save to DB
    await db
      .insert(receipts)
      .values({
        orderId,
        pngUrl: publicUrl,
        status: "generated",
        generatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: receipts.orderId,
        set: {
          pngUrl: publicUrl,
          status: "generated",
          generatedAt: new Date(),
          updatedAt: new Date(),
        },
      });

    // 5. Send Email
    await sendReceiptEmail(orderId, pngBuffer, publicUrl);
  } catch (error) {
    console.error(`Failed to process receipt for order ${orderId}:`, error);
    // Optionally update status to 'failed' in DB
    await db
      .insert(receipts)
      .values({
        orderId,
        pngUrl: "",
        status: "failed",
      })
      .onConflictDoUpdate({
        target: receipts.orderId,
        set: { status: "failed", updatedAt: new Date() },
      })
      .catch(() => {});
  }
}

async function sendReceiptEmail(
  orderId: string,
  pngBuffer: Buffer,
  pngUrl: string,
) {
  if (!resend) return;

  const orderResult = await db
    .select()
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);
  const order = orderResult[0];
  if (!order) return;

  const restaurantResult = await db
    .select()
    .from(restaurants)
    .where(eq(restaurants.id, order.restaurantId))
    .limit(1);
  const restaurant = restaurantResult[0];
  if (!restaurant) return;

  const restaurantName =
    (restaurant.name as any).en || (restaurant.name as any).tr || "Restaurant";

  const { data: customerProfile } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", order.customerId)
    .maybeSingle();
  if (!customerProfile?.email) return;

  const itemsTable = (order.items as any[])
    .map(
      (item) => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">${(item.name as any).en || (item.name as any).tr}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">₺${(item.unitPrice / 100).toFixed(2)}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">₺${(item.subtotal / 100).toFixed(2)}</td>
    </tr>
  `,
    )
    .join("");

  const emailHtml = `
    <div style="font-family: sans-serif; max-width: 600px; margin: auto;">
      <h2 style="color: #101744;">Order Receipt from ${restaurantName}</h2>
      <p>Thank you for your order! Here is your receipt summary.</p>
      
      <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
        <thead>
          <tr style="background: #f8f9fa;">
            <th style="padding: 10px; text-align: left;">Item</th>
            <th style="padding: 10px; text-align: center;">Qty</th>
            <th style="padding: 10px; text-align: right;">Unit</th>
            <th style="padding: 10px; text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsTable}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="3" style="padding: 10px; text-align: right;"><strong>Subtotal</strong></td>
            <td style="padding: 10px; text-align: right;">₺${(order.subtotal / 100).toFixed(2)}</td>
          </tr>
          <tr>
            <td colspan="3" style="padding: 10px; text-align: right;"><strong>Delivery Fee</strong></td>
            <td style="padding: 10px; text-align: right;">₺${(order.deliveryFee / 100).toFixed(2)}</td>
          </tr>
          ${
            order.discountAmount && order.discountAmount > 0
              ? `
          <tr style="color: green;">
            <td colspan="3" style="padding: 10px; text-align: right;"><strong>Discount</strong></td>
            <td style="padding: 10px; text-align: right;">-₺${(order.discountAmount / 100).toFixed(2)}</td>
          </tr>
          `
              : ""
          }
          <tr style="font-size: 1.2em; font-weight: bold;">
            <td colspan="3" style="padding: 10px; text-align: right;"><strong>Total</strong></td>
            <td style="padding: 10px; text-align: right;">₺${(order.total / 100).toFixed(2)}</td>
          </tr>
        </tfoot>
      </table>

      <div style="margin-top: 30px; padding: 20px; background: #f0f0f0; text-align: center; border-radius: 8px;">
        <p>You can also download your PNG receipt here: <a href="${pngUrl}">Download Receipt</a></p>
      </div>
    </div>
  `;

  await resend.emails
    .send({
      from: process.env.RESEND_FROM || "onboarding@resend.dev",
      to: customerProfile.email,
      subject: `[ORDER: ${order.id}] ${restaurantName}`,
      html: emailHtml,
      attachments: [
        {
          filename: `receipt_${order.id.slice(0, 8)}.png`,
          content: pngBuffer,
        },
      ],
    })
    .catch((err) => console.error("Failed to send receipt email:", err));

  // Update sentAt in DB
  await db
    .update(receipts)
    .set({ sentAt: new Date() })
    .where(eq(receipts.orderId, orderId))
    .catch(() => {});
}
