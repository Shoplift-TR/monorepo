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
  Bell,
} from "lucide-react";
import { useNotifications } from "@/contexts/NotificationContext";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export default function Sidebar() {
  const { user, logout } = useAdminAuth();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const {
    unreadCount,
    notifications,
    clearNotifications,
    dismissNotification,
  } = useNotifications();
  const [showNotifications, setShowNotifications] = useState(false);
  const locale = pathname?.split("/")[1] || "en";
  const withLocale = (path: string) =>
    path.startsWith(`/${locale}/`) ? path : `/${locale}${path}`;

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
    <div className="flex flex-col h-full bg-white border-r border-zinc-100 w-60">
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

        {/* Notification Bell */}
        <div className="relative mt-2">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-50 rounded-lg w-full transition-colors relative"
          >
            <div className="relative">
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#E2103C] text-[8px] font-bold text-white w-3.5 h-3.5 rounded-full flex items-center justify-center border-2 border-white">
                  {unreadCount}
                </span>
              )}
            </div>
            <span>Notifications</span>
          </button>

          {showNotifications && (
            <div className="absolute left-full ml-2 top-0 w-64 bg-white border border-zinc-100 rounded-xl shadow-xl z-100 p-4 max-h-100 overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-xs text-zinc-900 uppercase tracking-wider">
                  Alerts
                </h3>
                <button
                  onClick={clearNotifications}
                  className="text-[10px] text-zinc-400 hover:text-zinc-600 underline font-bold"
                >
                  Clear all
                </button>
              </div>
              {notifications.length === 0 ? (
                <p className="text-xs text-zinc-400 text-center py-4 italic">
                  No new notifications
                </p>
              ) : (
                <div className="space-y-2">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      className="p-2 bg-zinc-50 rounded-lg border border-zinc-100 group relative"
                    >
                      <p className="text-[11px] font-bold text-zinc-900 leading-tight">
                        New Order: #{n.id.slice(0, 8).toUpperCase()}
                      </p>
                      <p className="text-[10px] text-zinc-500 mt-1">
                        ₺{n.total.toFixed(2)}
                      </p>
                      <button
                        onClick={() => dismissNotification(n.id)}
                        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-2.5 h-2.5 text-zinc-400 hover:text-red-500" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
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
              href={withLocale(item.href)}
              onClick={() => setMobileOpen(false)}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
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
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm font-medium text-[#E2103C] hover:bg-red-50 transition-colors"
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
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-zinc-100 px-4 flex items-center justify-between z-40">
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
          <div className="h-full w-60" onClick={(e) => e.stopPropagation()}>
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
