"use client";

import { useState } from "react";
import { useAdminAuth } from "@/contexts/AdminAuthContext";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAdminAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setIsLoading(true);

    const { error } = await login(email, password);
    if (error) {
      setErrorMsg(error);
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-[420px] rounded-[16px] shadow-[0_2px_8px_rgba(0,0,0,0.08)] overflow-hidden">
        {/* Header Ribbon */}
        <div className="h-2 w-full bg-[#E2103C]" />

        <div className="p-8">
          <div className="flex flex-col items-center mb-8">
            <div className="flex items-center gap-2 mb-2">
              <h1 className="text-[28px] font-black tracking-tight text-zinc-900">
                Shoplift
              </h1>
            </div>
            <span className="px-2 py-0.5 bg-[#E2103C] text-white text-xs font-bold rounded-md uppercase tracking-wider">
              Admin Portal
            </span>
          </div>

          {errorMsg && (
            <div className="mb-6 p-3 bg-red-50 text-red-600 text-sm font-medium rounded-lg text-center">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="email"
                placeholder="Admin Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full h-12 px-4 rounded-[12px] bg-[#EEEEEE] text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#E2103C]/20 border border-transparent focus:border-[#E2103C] transition-all"
              />
            </div>

            <div>
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full h-12 px-4 rounded-[12px] bg-[#EEEEEE] text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#E2103C]/20 border border-transparent focus:border-[#E2103C] transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`
                w-full h-12 mt-2 rounded-[24px] bg-[#E2103C] text-white font-bold text-[15px]
                flex items-center justify-center
                ${isLoading ? "opacity-70 cursor-not-allowed" : "hover:bg-red-700 active:scale-[0.98] transition-all"}
              `}
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent animate-spin rounded-full" />
              ) : (
                "Log In"
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-xs text-zinc-400">
              Authorized personnel only. Admins are provisioned by super admins.
              No registration link.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
