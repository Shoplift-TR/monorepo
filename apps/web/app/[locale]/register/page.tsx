"use client";

import { useTranslations } from "next-intl";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter, useParams } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";

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

      // router.push is handled by useEffect if user gets populated
      // fallback manual push
      router.push(`/${locale}/restaurants`);
    } catch (err: any) {
      setError(tAuth("registerError"));
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[390px] mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-zinc-900 mb-6">
        {tAuth("register")}
      </h1>

      {error && (
        <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl mb-4 text-sm font-medium">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="sr-only" htmlFor="displayName">
            {tAuth("displayName")}
          </label>
          <input
            id="displayName"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder={tAuth("displayName")}
            required
            className="w-full h-12 px-4 rounded-xl bg-[#EEEEEE] focus:bg-white border border-transparent focus:border-zinc-300 focus:outline-none transition-colors"
          />
        </div>

        <div>
          <label className="sr-only" htmlFor="email">
            {tAuth("email")}
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={tAuth("email")}
            required
            className="w-full h-12 px-4 rounded-xl bg-[#EEEEEE] focus:bg-white border border-transparent focus:border-zinc-300 focus:outline-none transition-colors"
          />
        </div>

        <div>
          <label className="sr-only" htmlFor="phone">
            {tAuth("phone")}
          </label>
          <input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={tAuth("phone")}
            required
            className="w-full h-12 px-4 rounded-xl bg-[#EEEEEE] focus:bg-white border border-transparent focus:border-zinc-300 focus:outline-none transition-colors"
          />
        </div>

        <div>
          <label className="sr-only" htmlFor="password">
            {tAuth("password")}
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={tAuth("password")}
            required
            minLength={6}
            className="w-full h-12 px-4 rounded-xl bg-[#EEEEEE] focus:bg-white border border-transparent focus:border-zinc-300 focus:outline-none transition-colors"
          />
        </div>

        <div>
          <label className="sr-only" htmlFor="language">
            {tAuth("preferredLanguage")}
          </label>
          <select
            id="language"
            value={preferredLanguage}
            onChange={(e) =>
              setPreferredLanguage(e.target.value as "tr" | "en")
            }
            className="w-full h-12 px-4 appearance-none rounded-xl bg-[#EEEEEE] focus:bg-white border border-transparent focus:border-zinc-300 focus:outline-none transition-colors text-zinc-900"
          >
            <option value="tr">{tAuth("turkish")}</option>
            <option value="en">{tAuth("english")}</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full h-12 mt-2 rounded-full bg-[#E2103C] text-white font-bold hover:bg-[#c70d33] active:bg-[#a60b2b] transition-colors disabled:opacity-50"
        >
          {loading ? "..." : tAuth("register")}
        </button>
      </form>

      <div className="mt-6 text-center">
        <Link
          href={`/${locale}/login`}
          className="text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors"
        >
          {tAuth("alreadyHaveAccount")}
        </Link>
      </div>
    </div>
  );
}
