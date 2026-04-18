import { generateReceiptPng } from "../apps/api/src/lib/receipts.js";
import fs from "fs";

async function test() {
  const orderId = "c2562f2c-a419-4cc5-98bc-565a06e47ef0";
  console.log(`Testing receipt generation for order: ${orderId}`);
  try {
    const png = await generateReceiptPng(orderId);
    fs.writeFileSync("test-receipt.png", png);
    console.log("Success! Saved to test-receipt.png");
  } catch (error) {
    console.error("Failed to generate receipt:", error);
  }
}

test();
