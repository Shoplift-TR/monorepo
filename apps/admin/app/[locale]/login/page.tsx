"use client";

import { useState, useEffect } from "react";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { useTranslations } from "next-intl";
import { useRouter, useParams } from "next/navigation";

export default function LoginPage() {
  const t = useTranslations("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login, user, loading } = useAdminAuth();
  const router = useRouter();
  const { locale } = useParams();

  // Redirect when user is set after login
  useEffect(() => {
    if (loading) return;
    if (!user) return;

    if (user.role === "super_admin") {
      router.push(`/${locale}/super`);
    } else if (user.role === "restaurant_admin") {
      router.push(`/${locale}/restaurant/orders`);
    } else {
      router.push(`/${locale}/super`);
    }
  }, [user, loading, router, locale]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setIsLoading(true);

    const { error } = await login(email, password);
    if (error) {
      setErrorMsg(error);
      setIsLoading(false);
    }
    // Don't setIsLoading(false) on success —
    // keep spinner showing until useEffect redirects
  };

  // Show spinner while redirecting
  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f9fa]">
        <div
          className="w-10 h-10 border-[3px] border-[#92fc40] 
                        border-t-transparent animate-spin rounded-full"
        />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-[#f8f9fa] flex flex-col items-center 
                    justify-center p-6 font-sans"
    >
      <main
        className="w-full max-w-[440px] bg-white rounded-[1rem] p-8 
                       shadow-[0_12px_24px_rgba(0,4,53,0.08)] 
                       flex flex-col items-center"
      >
        <div className="mb-10 text-center flex flex-col items-center">
          <span className="text-2xl font-bold tracking-tighter text-[#101744]">
            Shoplift
          </span>
          <span
            className="text-[0.625rem] font-black uppercase 
                           tracking-[0.2em] text-[#101744]/40 mt-1"
          >
            {t("title")}
          </span>
        </div>

        <div className="w-full text-center mb-10">
          <h1
            className="text-2xl font-bold tracking-[-0.04em] 
                         text-[#101744] mb-2"
          >
            {t("welcomeBack")}
          </h1>
          <p className="text-[#5e5e5e] text-sm">{t("signInToAccount")}</p>
        </div>

        <form onSubmit={handleLogin} className="w-full space-y-6 text-left">
          <div className="space-y-2">
            <label
              className="block text-[0.6875rem] font-bold uppercase 
                         tracking-[0.05em] text-[#46464f] px-1"
              htmlFor="email"
            >
              {t("email")}
            </label>
            <input
              className="w-full h-12 px-6 rounded-xl bg-white ring-1 
                         ring-[#c7c5d0]/30 focus:ring-2 focus:ring-[#92fc40] 
                         focus:outline-none transition-all duration-200 
                         text-[#191c1d] placeholder:text-[#777680]/50"
              id="email"
              placeholder="name@company.com"
              type="email"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value.replace(/[<>'"`;]/g, "").slice(0, 254))
              }
              required
              maxLength={254}
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center px-1">
              <label
                className="block text-[0.6875rem] font-bold uppercase 
                           tracking-[0.05em] text-[#46464f]"
                htmlFor="password"
              >
                {t("password")}
              </label>
            </div>
            <input
              className="w-full h-12 px-6 rounded-xl bg-white ring-1 
                         ring-[#c7c5d0]/30 focus:ring-2 focus:ring-[#92fc40] 
                         focus:outline-none transition-all duration-200 
                         text-[#191c1d] placeholder:text-[#777680]/50"
              id="password"
              placeholder="••••••••"
              type="password"
              value={password}
              onChange={(e) =>
                setPassword(
                  e.target.value.replace(/[<>'"`;]/g, "").slice(0, 128),
                )
              }
              required
              maxLength={128}
            />
          </div>

          {errorMsg && (
            <p
              className="text-[#ba1a1a] text-xs font-bold 
                          text-center -mb-2 px-1"
            >
              {errorMsg}
            </p>
          )}

          <button
            disabled={isLoading}
            className="w-full h-12 mt-4 bg-[#92fc40] hover:bg-[#77df1e] 
                       text-[#0b2000] font-bold rounded-full transition-all 
                       duration-200 transform hover:scale-[1.02] 
                       active:scale-[0.98] flex items-center justify-center 
                       text-sm disabled:opacity-50"
            type="submit"
          >
            {isLoading ? (
              <div
                className="w-5 h-5 border-2 border-[#0b2000] 
                              border-t-transparent animate-spin rounded-full"
              />
            ) : (
              t("submit")
            )}
          </button>
        </form>

        <div className="mt-10 text-center px-4">
          <p
            className="text-[0.6875rem] text-[#5e5e5e] font-medium 
                        leading-relaxed italic opacity-60"
          >
            {t("authorizedPersonnelOnly")}
          </p>
        </div>
      </main>

      <footer className="fixed bottom-8 text-center w-full">
        <p
          className="text-[0.6875rem] font-bold uppercase tracking-[0.1em] 
                      text-[#c7c5d0]/60"
        >
          © 2025 Shoplift Global Inc.
        </p>
      </footer>
    </div>
  );
}
