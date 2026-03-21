"use client";

import { useTranslations } from "next-intl";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter, useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { Link } from "@/lib/navigation";
import { supabase } from "@/lib/supabase-client";
import { ChevronDown } from "lucide-react";

function sanitizeInput(value: string): string {
  return value.replace(/[<>'"`;]/g, "").trimStart();
}

export default function RegisterPage() {
  const tAuth = useTranslations("auth");
  const { register, login, user } = useAuth();
  const router = useRouter();
  const { locale } = useParams();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [preferredLanguage, setPreferredLanguage] = useState<"tr" | "en">(
    (locale as "tr" | "en") || "tr",
  );

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Redirect if already logged in or just logged in
  useEffect(() => {
    if (user) {
      if (user.role === "restaurant_admin") {
        router.push(`/${locale}/admin/restaurant/orders`);
      } else if (user.role === "super_admin") {
        router.push(`/${locale}/admin/super`);
      } else {
        router.push(`/${locale}/restaurants`);
      }
    }
  }, [user, router, locale]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await register({
        displayName,
        email,
        phone,
        password,
        preferredLanguage,
      });

      // Auto-login after successful registration
      await login(email, password);
    } catch (err: any) {
      setError(tAuth("registerError"));
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: "google" | "apple") => {
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: window.location.origin + "/" + locale + "/auth/callback",
      },
    });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center pt-24 pb-12 bg-[#f4f2ff] p-6 font-sans">
      <div className="w-full max-w-[520px] bg-white rounded-[1.5rem] p-10 shadow-[0_12px_24px_rgba(0,4,53,0.08)] flex flex-col">
        <div className="uppercase text-[0.6875rem] font-bold tracking-[0.05em] text-[#46464f] mb-2">
          {tAuth("newJourney")}
        </div>

        <h1 className="text-[#101744] font-extrabold text-[2rem] tracking-[-0.04em] mb-2 leading-tight">
          Join the{" "}
          <span className="text-[#92fc40]">{tAuth("elite") || "Elite"}</span>.
        </h1>

        <p className="text-[#5e5e5e] text-[0.9375rem] leading-[1.6] mb-8">
          {tAuth("registerSubtext")}
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label
                htmlFor="displayName"
                className="uppercase text-[0.6875rem] font-bold tracking-[0.05em] text-[#46464f] pl-1"
              >
                {tAuth("fullName")}
              </label>
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) =>
                  setDisplayName(
                    e.target.value.replace(/[^a-zA-ZÀ-ÿ\s]/g, "").slice(0, 60),
                  )
                }
                placeholder="John Doe"
                required
                className="w-full h-12 px-5 rounded-xl bg-[#f4f2ff] focus:bg-[#dfe0ff] focus:outline-none transition-all placeholder:text-[#777680]/50"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label
                htmlFor="phone"
                className="uppercase text-[0.6875rem] font-bold tracking-[0.05em] text-[#46464f] pl-1"
              >
                {tAuth("phone")}
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) =>
                  setPhone(
                    e.target.value.replace(/[^0-9+\s\-()]/g, "").slice(0, 20),
                  )
                }
                placeholder="+90 5xx xxx xx xx"
                required
                className="w-full h-12 px-5 rounded-xl bg-[#f4f2ff] focus:bg-[#dfe0ff] focus:outline-none transition-all placeholder:text-[#777680]/50"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="email"
              className="uppercase text-[0.6875rem] font-bold tracking-[0.05em] text-[#46464f] pl-1"
            >
              {tAuth("universityEmail")}
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(sanitizeInput(e.target.value))}
              maxLength={254}
              placeholder="student@university.edu"
              required
              className="w-full h-12 px-5 rounded-xl bg-[#f4f2ff] focus:bg-[#dfe0ff] focus:outline-none transition-all placeholder:text-[#777680]/50"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label
                htmlFor="password"
                className="uppercase text-[0.6875rem] font-bold tracking-[0.05em] text-[#46464f] pl-1"
              >
                {tAuth("password")}
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value.replace(/[<>'"`;]/g, ""))
                }
                maxLength={128}
                placeholder="••••••••"
                required
                minLength={6}
                className="w-full h-12 px-5 rounded-xl bg-[#f4f2ff] focus:bg-[#dfe0ff] focus:outline-none transition-all placeholder:text-[#777680]/50"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label
                htmlFor="language"
                className="uppercase text-[0.6875rem] font-bold tracking-[0.05em] text-[#46464f] pl-1"
              >
                {tAuth("language")}
              </label>
              <div className="relative">
                <select
                  id="language"
                  value={preferredLanguage}
                  onChange={(e) =>
                    setPreferredLanguage(e.target.value as "tr" | "en")
                  }
                  className="w-full h-12 px-5 rounded-xl bg-[#f4f2ff] focus:bg-[#dfe0ff] focus:outline-none transition-all appearance-none cursor-pointer"
                >
                  <option value="en">{tAuth("english")}</option>
                  <option value="tr">{tAuth("turkish")}</option>
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#46464f] pointer-events-none" />
              </div>
            </div>
          </div>

          {error && (
            <p className="text-[#ba1a1a] text-[0.875rem] mb-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-[52px] bg-[#92fc40] text-[#0b2000] font-bold text-[1rem] rounded-full transition-all hover:bg-[#77df1e] active:scale-[0.98] cursor-pointer disabled:opacity-50 flex items-center justify-center"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-[#0b2000] border-t-transparent rounded-full animate-spin" />
            ) : (
              tAuth("register")
            )}
          </button>
        </form>

        <div className="w-full flex items-center gap-4 my-8 text-[#777680]">
          <div className="flex-1 h-px bg-[#c7c5d0]/20" />
          <span className="uppercase text-[0.6875rem] font-bold tracking-[0.05em]">
            {tAuth("orRegisterWith")}
          </span>
          <div className="flex-1 h-px bg-[#c7c5d0]/20" />
        </div>

        <div className="w-full grid grid-cols-2 gap-4 mb-8">
          <button
            onClick={() => handleOAuth("google")}
            className="h-12 rounded-full cursor-pointer bg-white ring-1 ring-[#c7c5d0]/25 hover:bg-[#edeeef] flex items-center justify-center gap-2 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            <span className="uppercase text-[0.6875rem] font-bold tracking-[0.05em] text-[#191c1d]">
              {tAuth("continueWithGoogle")}
            </span>
          </button>
          <button
            onClick={() => handleOAuth("apple")}
            className="h-12 rounded-full cursor-pointer bg-white ring-1 ring-[#c7c5d0]/25 hover:bg-[#edeeef] flex items-center justify-center gap-2 transition-colors"
          >
            <svg className="w-4 h-4 fill-black" viewBox="0 0 24 24">
              <path d="M17.05 20.28c-.96.95-2.19 1.43-3.08 1.43-1.38 0-1.84-.71-3.69-.71s-2.48.69-3.68.69c-.93 0-2.12-.51-3.23-1.63C2.24 18.94 1 16.5 1 13.91c0-3.95 2.53-6.04 5.01-6.04.91 0 2.01.5 2.76.5.76 0 2.08-.57 3.16-.57 1.42 0 3.4.74 4.54 2.15-2.73 1.63-2.28 4.98.44 6.27-.66 1.77-1.84 3.12-3.06 4.06zM12.03 7.25c-.08-2.01 1.64-3.79 3.51-3.94.19 2.17-1.89 3.94-3.51 3.94z" />
            </svg>
            <span className="uppercase text-[0.6875rem] font-bold tracking-[0.05em] text-[#191c1d]">
              {tAuth("continueWithApple")}
            </span>
          </button>
        </div>

        <div className="text-center text-[0.875rem]">
          <span className="text-[#5e5e5e]">
            {tAuth("alreadyHaveAccountPart1") ||
              "Already have an account?"}{" "}
          </span>
          <Link
            href="/login"
            className="text-[#77df1e] font-bold hover:text-[#92fc40]"
          >
            {tAuth("signInAction") || "Sign in"}
          </Link>
        </div>
      </div>

      <div className="mt-8 flex gap-12 overflow-x-auto max-w-full no-scrollbar">
        <div className="flex flex-col items-center min-w-max">
          <div className="text-[#101744] font-extrabold text-[1.5rem]">
            100%
          </div>
          <div className="uppercase text-[0.6875rem] font-bold tracking-[0.05em] text-[#46464f]">
            {tAuth("secureData")}
          </div>
        </div>
        <div className="flex flex-col items-center min-w-max">
          <div className="text-[#101744] font-extrabold text-[1.5rem]">
            CAMPUS
          </div>
          <div className="uppercase text-[0.6875rem] font-bold tracking-[0.05em] text-[#46464f]">
            {tAuth("campusVerified")}
          </div>
        </div>
        <div className="flex flex-col items-center min-w-max">
          <div className="text-[#101744] font-extrabold text-[1.5rem]">
            FREE
          </div>
          <div className="uppercase text-[0.6875rem] font-bold tracking-[0.05em] text-[#46464f]">
            {tAuth("memberPerks")}
          </div>
        </div>
      </div>
    </div>
  );
}
