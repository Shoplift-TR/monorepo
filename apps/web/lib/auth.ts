import { supabase } from "./supabase";
import { User } from "@supabase/supabase-js";

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
}

export async function signUp(
  email: string,
  password: string,
  metadata?: Record<string, any>,
) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata,
    },
  });

  if (error) throw error;
  return data;
}

export async function signInWithOAuth(provider: "google" | "github" | "apple") {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });

  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentUser(): Promise<User | null> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
}

// Database functions for your schema
export async function createProfile(
  userId: string,
  email: string,
  displayName: string,
) {
  const { data, error } = await supabase.from("profiles").insert({
    id: userId,
    email,
    display_name: displayName,
    role: "customer",
  });

  if (error) throw error;
  return data;
}
