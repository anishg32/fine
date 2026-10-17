"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import type { Profile } from "@/lib/types";
import { fyzaStore } from "@/lib/store";

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  isDemoMode: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  updateProfile: (data: Partial<Profile>) => Promise<{ error: string | null }>;
  refreshProfile: () => Promise<void>;
  startDemoSession: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);

  const hasSupabase = isSupabaseConfigured();

  const setDemoCookie = (val: boolean) => {
    if (typeof document !== "undefined") {
      if (val) {
        document.cookie = "fyza_demo_session=true; path=/; max-age=604800; SameSite=Lax";
      } else {
        document.cookie = "fyza_demo_session=; path=/; max-age=0; SameSite=Lax";
      }
    }
  };

  const initDemoUser = useCallback(() => {
    fyzaStore.init();
    const demoProf = fyzaStore.getProfile();
    const mockUser: User = {
      id: demoProf.id,
      app_metadata: {},
      user_metadata: { full_name: demoProf.full_name },
      aud: "authenticated",
      created_at: demoProf.created_at,
      email: demoProf.email,
    };
    setUser(mockUser);
    setProfile(demoProf);
    setIsDemoMode(true);
    setDemoCookie(true);
  }, []);

  const fetchProfile = useCallback(async (userId: string) => {
    if (!hasSupabase) {
      return fyzaStore.getProfile();
    }
    try {
      const supabase = createClient();
      if (!supabase) return fyzaStore.getProfile();
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        return fyzaStore.getProfile();
      }
      return data as Profile;
    } catch {
      return fyzaStore.getProfile();
    }
  }, [hasSupabase]);

  const refreshProfile = useCallback(async () => {
    if (user) {
      const p = await fetchProfile(user.id);
      setProfile(p);
    }
  }, [user, fetchProfile]);

  useEffect(() => {
    const getSession = async () => {
      try {
        if (typeof window !== "undefined") {
          const isDemoActive =
            document.cookie.includes("fyza_demo_session=true") ||
            localStorage.getItem("fyza_demo_mode") === "true";

          if (isDemoActive || !hasSupabase) {
            initDemoUser();
            setLoading(false);
            return;
          }
        }

        if (hasSupabase) {
          const supabase = createClient();
          if (supabase) {
            const { data: { user: currentUser } } = await supabase.auth.getUser();
            setUser(currentUser);

            if (currentUser) {
              const p = await fetchProfile(currentUser.id);
              setProfile(p);
            }
          }
        }
      } catch {
        // Fallback to demo mode if any network error
        initDemoUser();
      } finally {
        setLoading(false);
      }
    };

    getSession();

    if (hasSupabase) {
      const supabase = createClient();
      if (supabase) {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (_event: unknown, session: { user?: User | null } | null) => {
            const currentUser = (session?.user as User) ?? null;
            setUser(currentUser);
            if (currentUser) {
              const p = await fetchProfile(currentUser.id);
              setProfile(p);
              setIsDemoMode(false);
            } else {
              setProfile(null);
            }
            setLoading(false);
          }
        );
        return () => subscription.unsubscribe();
      }
    }
  }, [hasSupabase, initDemoUser, fetchProfile]);

  const startDemoSession = () => {
    localStorage.setItem("fyza_demo_mode", "true");
    initDemoUser();
  };

  const signIn = async (email: string, password: string) => {
    if (!hasSupabase) {
      // Local authentication for instant testing & offline/demo
      initDemoUser();
      return { error: null };
    }

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error: error.message };
      setDemoCookie(false);
      setIsDemoMode(false);
      return { error: null };
    } catch {
      initDemoUser();
      return { error: null };
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    if (!hasSupabase) {
      initDemoUser();
      fyzaStore.updateProfile({ full_name: fullName, email });
      setProfile(fyzaStore.getProfile());
      return { error: null };
    }

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
        },
      });
      if (error) return { error: error.message };
      return { error: null };
    } catch {
      initDemoUser();
      return { error: null };
    }
  };

  const signInWithGoogle = async () => {
    if (!hasSupabase) {
      initDemoUser();
      return { error: null };
    }

    try {
      const supabase = createClient();
      if (!supabase) return { error: "Supabase client not initialized" };

      setDemoCookie(false);
      if (typeof localStorage !== "undefined") {
        localStorage.removeItem("fyza_demo_mode");
      }

      const redirectOrigin =
        typeof window !== "undefined" && window.location.origin
          ? window.location.origin
          : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${redirectOrigin}/auth/callback`,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (error) return { error: error.message };
      return { error: null };
    } catch (err: unknown) {
      return { error: (err as Error).message };
    }
  };

  const signOut = async () => {
    if (hasSupabase) {
      try {
        const supabase = createClient();
        await supabase.auth.signOut();
      } catch {
        // ignore
      }
    }
    setDemoCookie(false);
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem("fyza_demo_mode");
    }
    setUser(null);
    setProfile(null);
    setIsDemoMode(false);
  };

  const resetPassword = async (email: string) => {
    if (!hasSupabase) {
      return { error: null };
    }
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      return { error: error?.message ?? null };
    } catch {
      return { error: null };
    }
  };

  const updateProfile = async (data: Partial<Profile>) => {
    if (!user) return { error: "Not authenticated" };

    if (!hasSupabase || isDemoMode) {
      const updated = fyzaStore.updateProfile(data);
      setProfile(updated);
      return { error: null };
    }

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("profiles")
        .upsert({ id: user.id, ...data, updated_at: new Date().toISOString() });

      if (!error) {
        await refreshProfile();
      }
      return { error: error?.message ?? null };
    } catch (err: unknown) {
      return { error: (err as Error).message };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        isDemoMode,
        signIn,
        signUp,
        signInWithGoogle,
        signOut,
        resetPassword,
        updateProfile,
        refreshProfile,
        startDemoSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
