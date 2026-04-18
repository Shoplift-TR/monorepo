import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { resolve } from "path";

dotenv.config({ path: resolve(process.cwd(), ".env") });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  const { data: buckets, error } = await supabase.storage.listBuckets();
  if (error) {
    console.error("Error listing buckets:", error);
    return;
  }

  console.log(
    "Existing buckets:",
    buckets.map((b) => b.name),
  );

  if (!buckets.find((b) => b.name === "receipts")) {
    console.log("Creating receipts bucket...");
    const { data, error: createError } = await supabase.storage.createBucket(
      "receipts",
      {
        public: true,
        allowedMimeTypes: ["image/png"],
      },
    );
    if (createError) {
      console.error("Error creating bucket:", createError);
    } else {
      console.log("Bucket created successfully:", data);
    }
  } else {
    console.log("receipts bucket already exists.");
  }
}

main();
