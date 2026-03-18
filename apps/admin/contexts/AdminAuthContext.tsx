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
      // First check admin_profiles
      const { data: adminProfile, error: adminError } = await supabaseAdmin
        .from("admin_profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (adminProfile && adminProfile.is_active) {
        // Log to audit
        await logAction(userId, "LOGIN", "session", null);
        setUser({
          id: adminProfile.id,
          email: adminProfile.email,
          displayName: adminProfile.display_name,
          role: adminProfile.role,
          restaurantId: adminProfile.restaurant_id,
        });
        setLoading(false);
        return;
      }

      // If not found in admin_profiles, check regular profiles for restaurant_admin
      const { data: regularProfile } = await supabaseAdmin
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (regularProfile && regularProfile.role === "restaurant_admin") {
        // Log to audit (could be customer profiles audit system in the real setup)
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

      // Neither? Sign them out
      await supabaseAdmin.auth.signOut();
      setUser(null);
    } catch (e) {
      console.error(e);
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
    await supabaseAdmin.from("audit_logs").insert({
      admin_id: adminId,
      action,
      target_type: targetType,
      target_id: targetId,
    });
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

    // Update last_login
    await supabaseAdmin
      .from("admin_profiles")
      .update({ last_login_at: new Date().toISOString() })
      .eq("id", authData.user.id);

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
