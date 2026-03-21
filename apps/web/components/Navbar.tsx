"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useParams } from "next/navigation";
import { useRouter, Link } from "@/lib/navigation";
import { useState, useRef, useEffect } from "react";

export default function Navbar() {
  const { user, logout } = useAuth();
  const params = useParams();
  const locale = (params?.locale as string) ?? "en";
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
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

  const handleLogout = async () => {
    setDropdownOpen(false);
    await logout();
    router.push("/");
  };

  // Extract first name from displayName
  const firstName = user?.displayName?.split(" ")[0] || "";

  return (
    <header className="fixed top-0 w-full bg-white/80 backdrop-blur-xl z-50 border-b border-[rgba(199,197,208,0.15)]">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Wordmark */}
        <Link
          href="/"
          className="text-[#101744] font-bold text-xl tracking-tighter"
        >
          Shoplift
        </Link>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {/* Language toggle */}
          <Link
            href="/"
            locale={locale === "en" ? "tr" : "en"}
            className="text-[0.75rem] font-bold uppercase tracking-[0.05em] text-[#46464f] px-3 py-1.5 rounded-full bg-[#f3f4f5] hover:bg-[#edeeef] transition-colors"
          >
            {locale === "en" ? "EN / TR" : "TR / EN"}
          </Link>

          {user ? (
            /* LOGGED IN STATE */
            <div className="flex items-center gap-3">
              {/* Greeting */}
              <span className="text-[0.875rem] font-medium text-[#46464f] hidden sm:block">
                Hi,{" "}
                <span className="font-bold text-[#101744]">{firstName}</span>
              </span>

              {/* Settings button + dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="w-9 h-9 rounded-full bg-[#101744] flex items-center justify-center text-white font-bold text-sm hover:bg-[#1a2456] transition-colors focus:outline-none focus:ring-2 focus:ring-[#92fc40] focus:ring-offset-2"
                  aria-label="Open settings"
                >
                  {/* Hamburger / settings icon */}
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <rect
                      x="2"
                      y="4"
                      width="12"
                      height="1.5"
                      rx="0.75"
                      fill="white"
                    />
                    <rect
                      x="2"
                      y="7.25"
                      width="12"
                      height="1.5"
                      rx="0.75"
                      fill="white"
                    />
                    <rect
                      x="2"
                      y="10.5"
                      width="12"
                      height="1.5"
                      rx="0.75"
                      fill="white"
                    />
                  </svg>
                </button>

                {/* Dropdown menu */}
                {dropdownOpen && (
                  <div className="absolute right-0 top-[calc(100%+8px)] w-56 bg-white rounded-xl shadow-[0_12px_24px_rgba(0,4,53,0.12)] overflow-hidden z-50">
                    {/* User info header */}
                    <div className="px-4 py-3 bg-[#f8f9fa] border-b border-[rgba(199,197,208,0.2)]">
                      <p className="text-[0.875rem] font-bold text-[#101744] truncate">
                        {user.displayName}
                      </p>
                      {user.username && (
                        <p className="text-[0.75rem] text-[#5e5e5e] truncate">
                          @{user.username}
                        </p>
                      )}
                    </div>

                    {/* Menu items */}
                    <div className="py-1">
                      <Link
                        href="/orders"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-[0.875rem] text-[#191c1d] hover:bg-[#f3f4f5] transition-colors font-medium"
                      >
                        {/* Order history icon */}
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          fill="none"
                        >
                          <path
                            d="M3 2h10a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z"
                            stroke="#46464f"
                            strokeWidth="1.5"
                          />
                          <path
                            d="M5 6h6M5 9h4"
                            stroke="#46464f"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                          />
                        </svg>
                        My Orders
                      </Link>

                      <Link
                        href="/settings"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-[0.875rem] text-[#191c1d] hover:bg-[#f3f4f5] transition-colors font-medium"
                      >
                        {/* Settings icon */}
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
                            stroke="#46464f"
                            strokeWidth="1.5"
                          />
                          <path
                            d="M8 1v2M8 13v2M1 8h2M13 8h2M2.93 2.93l1.41 1.41M11.66 11.66l1.41 1.41M2.93 13.07l1.41-1.41M11.66 4.34l1.41-1.41"
                            stroke="#46464f"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                          />
                        </svg>
                        Settings
                      </Link>

                      <div className="h-px bg-[rgba(199,197,208,0.2)] mx-4 my-1" />

                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-[0.875rem] text-[#ba1a1a] hover:bg-[#fff5f5] transition-colors font-medium"
                      >
                        {/* Logout icon */}
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          fill="none"
                        >
                          <path
                            d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3M10 11l3-3-3-3M13 8H6"
                            stroke="#ba1a1a"
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
            /* LOGGED OUT STATE */
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="text-[0.875rem] font-medium text-[#191c1d] px-4 py-2 rounded-full hover:bg-[#f3f4f5] transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="text-[0.875rem] font-bold text-white bg-[#101744] px-4 py-2 rounded-full hover:bg-[#1a2456] transition-colors"
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
