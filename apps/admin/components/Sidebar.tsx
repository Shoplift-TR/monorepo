"use client";

import { useAdminAuth } from "@/contexts/AdminAuthContext";
import {
  UtensilsCrossed,
  Grid,
  BarChart,
  LayoutDashboard,
  Store,
  Users,
  Receipt,
  ShieldCheck,
  PackageSearch,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export default function Sidebar() {
  const { user, logout } = useAdminAuth();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!user) return null;

  const isSuper = user.role === "super_admin";

  const restaurantNav = [
    { href: "/restaurant/orders", label: "Orders", icon: UtensilsCrossed },
    { href: "/restaurant/menu", label: "Menu & Inventory", icon: Grid },
    { href: "/restaurant/analytics", label: "Analytics", icon: BarChart },
  ];

  const superNav = [
    { href: "/super", label: "Overview", icon: LayoutDashboard },
    { href: "/super/restaurants", label: "Restaurants", icon: Store },
    { href: "/super/users", label: "Users", icon: Users },
    { href: "/super/refunds", label: "Refunds", icon: Receipt },
    { href: "/super/audit", label: "Audit Log", icon: ShieldCheck },
    { href: "/super/inventory", label: "Inventory", icon: PackageSearch },
  ];

  const navItems = isSuper ? superNav : restaurantNav;

  const SidebarContent = (
    <div className="flex flex-col h-full bg-white border-r border-zinc-100 w-[240px]">
      <div className="p-6">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-black tracking-tight text-zinc-900">
            Shoplift
          </h1>
          <span className="px-2 py-0.5 bg-[#E2103C] text-white text-[10px] font-bold rounded-md">
            ADMIN
          </span>
        </div>
        <div className="mt-4 pb-4 border-b border-zinc-100">
          <p className="font-bold text-sm text-zinc-900 truncate">
            {user.displayName}
          </p>
          <p className="text-xs text-zinc-500 capitalize">
            {user.role.replace("_", " ")}
          </p>
        </div>
      </div>

      <div className="flex-1 px-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-[8px] text-sm font-medium transition-colors
                ${
                  isActive
                    ? "bg-[#E2103C] text-white"
                    : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
                }
              `}
            >
              <Icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}
      </div>

      <div className="p-4 border-t border-zinc-100">
        <button
          onClick={() => {
            setMobileOpen(false);
            logout();
          }}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-[8px] text-sm font-medium text-[#E2103C] hover:bg-red-50 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Logout
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Nav Toggle */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-zinc-100 px-4 flex items-center justify-between z-40 relative">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-black tracking-tight text-zinc-900">
            Shoplift
          </h1>
          <span className="px-2 py-0.5 bg-[#E2103C] text-white text-[10px] font-bold rounded-md">
            ADMIN
          </span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 -mr-2"
        >
          {mobileOpen ? (
            <X className="w-6 h-6 text-zinc-900" />
          ) : (
            <Menu className="w-6 h-6 text-zinc-900" />
          )}
        </button>
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        >
          <div
            className="h-full w-[240px]"
            onClick={(e) => e.stopPropagation()}
          >
            {SidebarContent}
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <div className="hidden lg:block fixed inset-y-0 left-0 z-50">
        {SidebarContent}
      </div>
    </>
  );
}
