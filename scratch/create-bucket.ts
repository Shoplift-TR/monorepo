import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
dotenv.config({ path: resolve(__dirname, "../.env") });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  const { data, error } = await supabase.storage.createBucket("receipts", {
    public: true,
  });
  if (error) {
    if (error.message.includes("already exists")) {
      console.log("Bucket already exists");
    } else {
      console.error("Error creating bucket:", error);
    }
  } else {
    console.log("Bucket created:", data);
  }
}

main();
