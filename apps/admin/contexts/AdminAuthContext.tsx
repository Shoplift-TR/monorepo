"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { useRouter } from "next/navigation";

interface AdminUser {
  id: string;
  email: string;
  displayName: string;
  role: string;
  restaurantId: string | null;
}

interface AdminAuthContextType {
  user: AdminUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(
  undefined,
);

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const initializeAuth = async () => {
      const {
        data: { session },
      } = await supabaseAdmin.auth.getSession();

      if (session) {
        await fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }

      const { data: authListener } = supabaseAdmin.auth.onAuthStateChange(
        async (event, session) => {
          if (session) {
            await fetchProfile(session.user.id);
          } else {
            setUser(null);
            setLoading(false);
          }
        },
      );

      return () => {
        authListener.subscription.unsubscribe();
      };
    };

    initializeAuth();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data: adminProfile } = await supabaseAdmin
        .from("admin_profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (adminProfile && adminProfile.is_active) {
        setUser({
          id: adminProfile.id,
          email: adminProfile.email,
          displayName: adminProfile.display_name,
          role: adminProfile.role,
          restaurantId: adminProfile.restaurant_id,
        });
        setLoading(false);

        // Fire-and-forget — never block auth flow
        logAction(userId, "LOGIN", "session", null).catch((err) =>
          console.warn("Audit log failed (non-critical):", err),
        );
        return;
      }

      // Fallback to regular profiles
      const { data: regularProfile } = await supabaseAdmin
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (
        regularProfile &&
        (regularProfile.role === "restaurant_admin" ||
          regularProfile.role === "super_admin")
        // TODO: profiles table needs is_active column to match admin_profiles security model
      ) {
        setUser({
          id: regularProfile.id,
          email: regularProfile.email,
          displayName: regularProfile.display_name,
          role: regularProfile.role,
          restaurantId: regularProfile.restaurant_id,
        });
        setLoading(false);
        return;
      }

      // Not an admin — sign out
      await supabaseAdmin.auth.signOut();
      setUser(null);
    } catch (e) {
      console.error("fetchProfile error:", e);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const logAction = async (
    adminId: string,
    action: string,
    targetType: string,
    targetId: string | null,
  ) => {
    try {
      const {
        data: { session },
      } = await supabaseAdmin.auth.getSession();
      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/admin/audit`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(session?.access_token
              ? { Authorization: `Bearer ${session.access_token}` }
              : {}),
          },
          credentials: "include",
          body: JSON.stringify({ action, targetType, targetId }),
        },
      );
    } catch {
      // Completely silent
    }
  };
  const login = async (email: string, password: string) => {
    const { data: authData, error } =
      await supabaseAdmin.auth.signInWithPassword({
        email,
        password,
      });

    if (error) {
      return { error: error.message };
    }

    // Fire-and-forget last_login update
    (async () => {
      try {
        await supabaseAdmin
          .from("admin_profiles")
          .update({ last_login_at: new Date().toISOString() })
          .eq("id", authData.user.id);
      } catch (err: any) {
        console.warn("last_login update failed:", err);
      }
    })();

    return { error: null };
  };

  const logout = async () => {
    await supabaseAdmin.auth.signOut();
    setUser(null);
    router.push("/login");
  };

  return (
    <AdminAuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (context === undefined) {
    throw new Error("useAdminAuth must be used within an AdminAuthProvider");
  }
  return context;
};
