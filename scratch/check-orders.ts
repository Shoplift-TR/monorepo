import { db, orders, receipts } from "@shoplift/db";
import { eq, desc } from "drizzle-orm";

async function check() {
  const recentOrders = await db
    .select()
    .from(orders)
    .orderBy(desc(orders.createdAt))
    .limit(5);
  console.log("Recent Orders:");
  for (const order of recentOrders) {
    const receipt = await db
      .select()
      .from(receipts)
      .where(eq(receipts.orderId, order.id))
      .limit(1);
    console.log(`Order ID: ${order.id}`);
    console.log(`Status: ${order.status}`);
    console.log(`Receipt Status: ${receipt[0]?.status || "N/A"}`);
    console.log(`Receipt URL: ${receipt[0]?.pngUrl || "N/A"}`);
    console.log("---");
  }
}

check().catch(console.error);
