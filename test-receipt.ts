import { processReceipt } from "./apps/api/src/lib/receipts.ts";
import dotenv from "dotenv";
import { resolve } from "path";

dotenv.config({ path: resolve(process.cwd(), ".env") });

async function main() {
  const orderId = process.argv[2];
  if (!orderId) {
    console.error("Usage: tsx scratch/test-receipt.ts <orderId>");
    process.exit(1);
  }

  console.log(`Testing receipt for order ${orderId}...`);
  await processReceipt(orderId);
  console.log("Test finished.");
}

main();
