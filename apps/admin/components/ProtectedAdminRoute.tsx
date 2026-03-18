"use client";

import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";

interface ProtectedAdminRouteProps {
  children: React.ReactNode;
  allowedRoles: ("super_admin" | "restaurant_admin")[];
}

export default function ProtectedAdminRoute({
  children,
  allowedRoles,
}: ProtectedAdminRouteProps) {
  const { user, loading } = useAdminAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.push("/login");
      return;
    }

    if (!allowedRoles.includes(user.role as any)) {
      if (user.role === "super_admin") {
        router.push("/super");
      } else if (user.role === "restaurant_admin") {
        router.push("/restaurant/orders");
      } else {
        router.push("/login");
      }
    }
  }, [user, loading, allowedRoles, router, pathname]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <div className="w-10 h-10 border-4 border-red-500 border-t-transparent animate-spin rounded-full" />
      </div>
    );
  }

  if (!allowedRoles.includes(user.role as any)) {
    return null; // Redirect handles it
  }

  return <>{children}</>;
}
