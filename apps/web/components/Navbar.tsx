"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useParams } from "next/navigation";
import { useRouter, Link } from "@/lib/navigation";
import { useState, useRef, useEffect } from "react";

export default function Navbar() {
  const { user, logout, loading } = useAuth();
  const params = useParams();
  const locale = (params?.locale as string) ?? "en";
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = async () => {
    setDropdownOpen(false);
    await logout();
    router.push("/");
  };

  const firstName = user?.displayName?.split(" ")[0] || "";

  if (!mounted) {
    // Return a skeleton that matches server render exactly
    return (
      <header
        className="fixed top-0 w-full bg-white/80 backdrop-blur-xl z-50 
                         border-b border-[rgba(199,197,208,0.15)] h-16"
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="text-[#101744] font-bold text-xl tracking-tighter">
            Shoplift
          </span>
        </div>
      </header>
    );
  }

  return (
    <header
      suppressHydrationWarning
      className="fixed top-0 w-full bg-white/80 dark:bg-[#0f1117]/80 backdrop-blur-xl z-50 border-b border-[rgba(199,197,208,0.15)] dark:border-[rgba(255,255,255,0.06)]"
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link
          href="/"
          className="text-[#101744] dark:text-[#e8eaf0] font-bold text-xl tracking-tighter"
        >
          Shoplift
        </Link>

        <div className="flex items-center gap-3">
          <Link
            href="/"
            locale={locale === "en" ? "tr" : "en"}
            className="text-[0.75rem] font-bold uppercase tracking-[0.05em] 
                       text-[#46464f] dark:text-[#9ba3b8] px-3 py-1.5 rounded-full 
                       bg-[#f3f4f5] dark:bg-[#222536] hover:bg-[#edeeef] 
                       dark:hover:bg-[#272a3d] transition-colors"
          >
            {locale === "en" ? "EN / TR" : "TR / EN"}
          </Link>

          {user ? (
            <div className="flex items-center gap-3">
              <span className="text-[0.875rem] font-medium text-[#46464f] dark:text-[#9ba3b8] hidden sm:block">
                Hi,{" "}
                <span className="font-bold text-[#101744] dark:text-[#92fc40]">
                  {firstName}
                </span>
              </span>

              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="w-9 h-9 rounded-full bg-[#101744] dark:bg-[#92fc40] 
                             flex items-center justify-center text-white dark:text-[#0b2000] 
                             font-bold text-sm hover:bg-[#1a2456] dark:hover:bg-[#77df1e] 
                             transition-colors focus:outline-none"
                  aria-label="Open settings"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <rect
                      x="2"
                      y="4"
                      width="12"
                      height="1.5"
                      rx="0.75"
                      fill="currentColor"
                    />
                    <rect
                      x="2"
                      y="7.25"
                      width="12"
                      height="1.5"
                      rx="0.75"
                      fill="currentColor"
                    />
                    <rect
                      x="2"
                      y="10.5"
                      width="12"
                      height="1.5"
                      rx="0.75"
                      fill="currentColor"
                    />
                  </svg>
                </button>

                {dropdownOpen && (
                  <div
                    className="absolute right-0 top-[calc(100%+8px)] w-56 
                                  bg-white dark:bg-[#1e2235] rounded-xl 
                                  shadow-[0_12px_24px_rgba(0,4,53,0.12)] 
                                  overflow-hidden z-50 border dark:border-[rgba(255,255,255,0.06)]"
                  >
                    <div
                      className="px-4 py-3 bg-[#f8f9fa] dark:bg-[#222536] 
                                    border-b border-[rgba(199,197,208,0.2)] 
                                    dark:border-[rgba(255,255,255,0.06)]"
                    >
                      <p
                        className="text-[0.875rem] font-bold text-[#101744] 
                                    dark:text-[#e8eaf0] truncate"
                      >
                        {user.displayName}
                      </p>
                      {user.username && (
                        <p className="text-[0.75rem] text-[#5e5e5e] dark:text-[#9ba3b8] truncate">
                          @{user.username}
                        </p>
                      )}
                    </div>

                    <div className="py-1">
                      <Link
                        href="/orders"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-[0.875rem] 
                                   text-[#191c1d] dark:text-[#e8eaf0] hover:bg-[#f3f4f5] 
                                   dark:hover:bg-[#272a3d] transition-colors font-medium"
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          fill="none"
                        >
                          <path
                            d="M3 2h10a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z"
                            stroke="currentColor"
                            strokeWidth="1.5"
                          />
                          <path
                            d="M5 6h6M5 9h4"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                          />
                        </svg>
                        My Orders
                      </Link>

                      <Link
                        href="/settings"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-[0.875rem] 
                                   text-[#191c1d] dark:text-[#e8eaf0] hover:bg-[#f3f4f5] 
                                   dark:hover:bg-[#272a3d] transition-colors font-medium"
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          fill="none"
                        >
                          <circle
                            cx="8"
                            cy="8"
                            r="2.5"
                            stroke="currentColor"
                            strokeWidth="1.5"
                          />
                          <path
                            d="M8 1v2M8 13v2M1 8h2M13 8h2M2.93 2.93l1.41 1.41M11.66 11.66l1.41 1.41M2.93 13.07l1.41-1.41M11.66 4.34l1.41-1.41"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                          />
                        </svg>
                        Settings
                      </Link>

                      <div className="h-px bg-[rgba(199,197,208,0.2)] dark:bg-[rgba(255,255,255,0.06)] mx-4 my-1" />

                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-[0.875rem] 
                                   text-[#ba1a1a] dark:text-[#ff897d] hover:bg-[#fff5f5] 
                                   dark:hover:bg-[#3d2727] transition-colors font-medium"
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          fill="none"
                        >
                          <path
                            d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3M10 11l3-3-3-3M13 8H6"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        Log Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="text-[0.875rem] font-medium text-[#191c1d] dark:text-[#e8eaf0] 
                           px-4 py-2 rounded-full hover:bg-[#f3f4f5] dark:hover:bg-[#222536] 
                           transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="text-[0.875rem] font-bold text-white dark:text-[#0b2000] 
                           bg-[#101744] dark:bg-[#92fc40] px-4 py-2 rounded-full 
                           hover:bg-[#1a2456] dark:hover:bg-[#77df1e] transition-colors"
              >
                Create Account
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
