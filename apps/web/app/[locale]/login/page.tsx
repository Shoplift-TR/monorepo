"use client";

import { useTranslations } from "next-intl";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter, useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { Link } from "@/lib/navigation";

export default function LoginPage() {
  const t = useTranslations("auth");
  const { login, user } = useAuth();
  const router = useRouter();
  const { locale } = useParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
      await login(email, password);
      // Success redirection is handled by the useEffect watching [user]
    } catch (err: any) {
      setError(t("loginError"));
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[390px] mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-zinc-900 mb-6">{t("login")}</h1>

      {error && (
        <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl mb-4 text-sm font-medium">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="sr-only" htmlFor="email">
            {t("email")}
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("email")}
            required
            className="w-full h-12 px-4 rounded-xl bg-[#EEEEEE] focus:bg-white border border-transparent focus:border-zinc-300 focus:outline-none transition-colors"
          />
        </div>
        <div>
          <label className="sr-only" htmlFor="password">
            {t("password")}
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t("password")}
            required
            className="w-full h-12 px-4 rounded-xl bg-[#EEEEEE] focus:bg-white border border-transparent focus:border-zinc-300 focus:outline-none transition-colors"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full h-12 mt-2 rounded-full bg-[#E2103C] text-white font-bold hover:bg-[#c70d33] active:bg-[#a60b2b] transition-colors disabled:opacity-50"
        >
          {loading ? "..." : t("login")}
        </button>
      </form>

      <div className="mt-6 text-center">
        <Link
          href="/register"
          className="text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors"
        >
          {t("dontHaveAccount")}
        </Link>
      </div>
    </div>
  );
}
