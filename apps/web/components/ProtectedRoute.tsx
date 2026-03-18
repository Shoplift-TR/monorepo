"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter, useParams } from "next/navigation";
import { useEffect } from "react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string | string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
}) => {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { locale } = useParams();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.push(`/${locale}/login`);
      return;
    }

    if (requiredRole) {
      const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
      if (!roles.includes(user.role)) {
        // Redirect to their respective dashboard
        if (user.role === "super_admin") {
          router.push(`/${locale}/admin/super`);
        } else if (user.role === "restaurant_admin") {
          router.push(`/${locale}/admin/restaurant`);
        } else if (user.role === "driver") {
          router.push(`/${locale}/driver`);
        } else {
          router.push(`/${locale}`);
        }
      }
    }
  }, [user, loading, requiredRole, locale, router]);

  if (loading || !user) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        Loading...
      </div>
    );
  }

  if (requiredRole) {
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    if (!roles.includes(user.role)) {
      return null; // The redirect in useEffect handles it
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
