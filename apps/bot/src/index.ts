import { Bot, Context } from "grammy";
import * as dotenv from "dotenv";
dotenv.config();

if (!process.env.TELEGRAM_BOT_TOKEN) {
  console.error("TELEGRAM_BOT_TOKEN not found in environment.");
  process.exit(1);
}

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN!);

// Handle /start
bot.command("start", (ctx: Context) => ctx.reply("Shoplift Bot active."));

// Handle order notification callbacks (confirm/reject via inline buttons)
bot.callbackQuery(/^confirm:(.+)$/, async (ctx: Context) => {
  const match = ctx.match;
  if (!match) return;
  const orderId = match[1];
  // Call your Fastify API to confirm the order
  try {
    const response = await fetch(
      `${process.env.API_URL}/orders/${orderId}/status`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.BOT_SERVICE_TOKEN}`,
        },
        body: JSON.stringify({ status: "CONFIRMED" }),
      },
    );

    if (response.ok) {
      await ctx.answerCallbackQuery("Order confirmed");
      await ctx.editMessageText(
        `✅ Order confirmed (ID: ${orderId.slice(0, 8)})`,
      );
    } else {
      await ctx.answerCallbackQuery("Failed to confirm order.");
    }
  } catch (error) {
    console.error("Order confirm error:", error);
    await ctx.answerCallbackQuery("Error calling API");
  }
});

bot.callbackQuery(/^reject:(.+)$/, async (ctx: Context) => {
  const match = ctx.match;
  if (!match) return;
  const orderId = match[1];
  try {
    const response = await fetch(
      `${process.env.API_URL}/orders/${orderId}/reject`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.BOT_SERVICE_TOKEN}`,
        },
        body: JSON.stringify({ reason: "Rejected via Telegram" }),
      },
    );

    if (response.ok) {
      await ctx.answerCallbackQuery("Order rejected");
      await ctx.editMessageText(
        `❌ Order rejected (ID: ${orderId.slice(0, 8)})`,
      );
    } else {
      await ctx.answerCallbackQuery("Failed to reject order.");
    }
  } catch (error) {
    console.error("Order reject error:", error);
    await ctx.answerCallbackQuery("Error calling API");
  }
});

bot.start();
console.log("Bot running");
