"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { authApi } from "@/lib/api";
import { supabase } from "@/lib/supabase-client";

// Store token in memory (not localStorage) for security
let memoryToken: string | null = null;

export interface AuthState {
  uid: string;
  email: string;
  displayName: string;
  username: string | null;
  role: string;
  restaurantId: string | null;
}

interface AuthContextType {
  user: AuthState | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (body: any) => Promise<void>;
  logout: () => Promise<void>;
  updateUsername: (username: string) => Promise<{ error: string | null }>;
  rehydrate: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<AuthState | null>(null);
  const [loading, setLoading] = useState(true);

  const rehydrate = async () => {
    try {
      // Try to get token from Supabase client session first
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.access_token) {
        memoryToken = session.access_token;
      }

      const { data, error } = await authApi.me(memoryToken);
      if (!error && data) {
        setUser(data);
      } else {
        setUser(null);
      }
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    rehydrate();
  }, []);

  const login = async (email: string, password: string) => {
    const { data, error } = await authApi.login({ email, password });
    if (error) throw new Error(error);
    if (data) {
      await rehydrate();
    }
  };

  const register = async (body: any) => {
    const { data, error } = await authApi.register(body);
    if (error) throw new Error(error);
    if (data) {
      await rehydrate();
    }
  };

  const logout = async () => {
    try {
      // 1. Sign out from API (clears httpOnly cookie)
      await authApi.logout();
    } catch (error) {
      console.error("API logout failed:", error);
    }

    try {
      // 2. Sign out from Supabase browser client (clears local session)
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Supabase logout failed:", error);
    }

    // 3. Clear user state
    setUser(null);

    // 4. Redirect to login
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  };

  const updateUsername = async (
    username: string,
  ): Promise<{ error: string | null }> => {
    const { data, error } = await authApi.updateUsername(username);
    if (!error) {
      await rehydrate();
      return { error: null };
    }
    return { error };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        updateUsername,
        rehydrate,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
