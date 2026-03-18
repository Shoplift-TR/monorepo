"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { authApi } from "@/lib/api";

export interface AuthState {
  uid: string;
  email: string;
  displayName: string;
  role: string;
  restaurantId: string | null;
}

interface AuthContextType {
  user: AuthState | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (body: any) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<AuthState | null>(null);
  const [loading, setLoading] = useState(true);

  const rehydrate = async () => {
    try {
      const { data, error } = await authApi.me();
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
    await authApi.logout();
    setUser(null);
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
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
