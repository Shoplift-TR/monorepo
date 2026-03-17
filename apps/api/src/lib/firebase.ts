import { initializeApp, cert, getApp, getApps, App } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import dotenv from "dotenv";
import { resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
dotenv.config({ path: resolve(__dirname, "../../../../.env") });

const isDev =
  process.env.NODE_ENV === "development" ||
  !!process.env.FIRESTORE_EMULATOR_HOST ||
  !!process.env.FIREBASE_AUTH_EMULATOR_HOST;

let app: App;

if (getApps().length === 0) {
  if (isDev) {
    // In development, we connect to the local Firebase Emulator Suite.
    // These environment variables tell the Admin SDK to use emulators instead of real services.
    process.env.FIRESTORE_EMULATOR_HOST = "localhost:8080";
    process.env.FIREBASE_AUTH_EMULATOR_HOST = "localhost:9099";

    app = initializeApp({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "shoplift-dev",
    });
  } else {
    // In production/staging, we use the service account key from environment variables.
    if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      throw new Error(
        "FIREBASE_SERVICE_ACCOUNT_KEY environment variable is required in production",
      );
    }

    try {
      const serviceAccount = JSON.parse(
        process.env.FIREBASE_SERVICE_ACCOUNT_KEY,
      );
      app = initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.project_id,
      });
    } catch (error) {
      throw new Error(
        "Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY. Ensure it is a valid JSON string.",
        { cause: error },
      );
    }
  }
} else {
  app = getApp();
}

/**
 * Firestore instance for database operations
 */
export const db: Firestore = getFirestore(app);

/**
 * Auth instance for authentication operations (ID token verification, user management)
 */
export const auth = getAuth(app);

export default app;
