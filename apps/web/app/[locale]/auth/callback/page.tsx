"use client";
import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useRouter } from "@/lib/navigation";
import { supabase } from "@/lib/supabase-client";
import { useAuth } from "@/contexts/AuthContext";

export default function AuthCallbackPage() {
  const router = useRouter();
  const { locale } = useParams();
  const { rehydrate } = useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error || !session) {
        router.push("/login");
        return;
      }

      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/auth/oauth-callback`,
          {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              access_token: session.access_token,
            }),
          },
        );

        if (response.ok) {
          // Cookie is now set — rehydrate auth context before navigating
          await rehydrate();
          router.push("/restaurants");
        } else {
          router.push("/login");
        }
      } catch {
        router.push("/login");
      }
    };

    handleCallback();
  }, [router, locale, rehydrate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8f9fa]">
      <div className="w-10 h-10 border-[3px] border-[#92fc40] border-t-transparent animate-spin rounded-full" />
    </div>
  );
}
