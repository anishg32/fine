"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  updateProfile as firebaseUpdateProfile,
  onAuthStateChanged,
  type User as FirebaseUser,
} from "firebase/auth";
import { getFirebaseAuth, googleProvider, isFirebaseConfigured } from "@/lib/firebase/config";
import { fetchUserProfile, upsertUserProfile } from "@/lib/firebase/db";
import type { Profile } from "@/lib/types";
import { fyzaStore } from "@/lib/store";

export interface AuthUser {
  id: string;
  email: string | null;
  displayName?: string | null;
  photoURL?: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
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

function mapFirebaseUser(user: FirebaseUser): AuthUser {
  return {
    id: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);

  const hasFirebase = isFirebaseConfigured();

  const setCookie = (name: string, val: boolean) => {
    if (typeof document !== "undefined") {
      if (val) {
        document.cookie = `${name}=true; path=/; max-age=604800; SameSite=Lax`;
      } else {
        document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
      }
    }
  };

  const initDemoUser = useCallback(() => {
    fyzaStore.init();
    const demoProf = fyzaStore.getProfile();
    const mockUser: AuthUser = {
      id: demoProf.id,
      email: demoProf.email,
      displayName: demoProf.full_name,
    };
    setUser(mockUser);
    setProfile(demoProf);
    setIsDemoMode(true);
    setCookie("fyza_demo_session", true);
    setCookie("fyza_session", false);
  }, []);

  const loadProfile = useCallback(
    async (userId: string, email?: string | null, name?: string | null) => {
      if (!hasFirebase) {
        return fyzaStore.getProfile();
      }
      try {
        const existing = await fetchUserProfile(userId);
        if (existing) return existing;

        // Auto-provision initial profile if first time login
        const newProf: Profile = {
          id: userId,
          email: email || "user@fyza.finance",
          full_name: name || null,
          avatar_url: null,
          preferred_currency: "INR",
          locale: "en-IN",
          timezone: "Asia/Kolkata",
          week_start: "monday",
          date_format: "DD/MM/YYYY",
          onboarding_completed: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        await upsertUserProfile(newProf);
        return newProf;
      } catch (err) {
        console.error("Failed to load profile:", err);
        return fyzaStore.getProfile();
      }
    },
    [hasFirebase]
  );

  const refreshProfile = useCallback(async () => {
    if (user) {
      const p = await loadProfile(user.id, user.email, user.displayName);
      setProfile(p);
    }
  }, [user, loadProfile]);

  useEffect(() => {
    const checkInitialSession = async () => {
      try {
        if (typeof window !== "undefined") {
          const isDemoActive =
            document.cookie.includes("fyza_demo_session=true") ||
            localStorage.getItem("fyza_demo_mode") === "true";

          if (isDemoActive || !hasFirebase) {
            initDemoUser();
            setLoading(false);
            return;
          }
        }

        const auth = getFirebaseAuth();
        if (!auth) {
          initDemoUser();
          setLoading(false);
          return;
        }

        // Subscribe to Firebase Auth state
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
          if (currentUser) {
            const mapped = mapFirebaseUser(currentUser);
            setUser(mapped);
            setCookie("fyza_session", true);
            setCookie("fyza_demo_session", false);
            setIsDemoMode(false);
            const prof = await loadProfile(
              currentUser.uid,
              currentUser.email,
              currentUser.displayName
            );
            setProfile(prof);
          } else {
            // Check if demo session is requested
            const isDemoActive =
              typeof window !== "undefined" &&
              (document.cookie.includes("fyza_demo_session=true") ||
                localStorage.getItem("fyza_demo_mode") === "true");

            if (isDemoActive) {
              initDemoUser();
            } else {
              setUser(null);
              setProfile(null);
              setCookie("fyza_session", false);
            }
          }
          setLoading(false);
        });

        return () => unsubscribe();
      } catch (err) {
        console.error("Auth init error:", err);
        initDemoUser();
        setLoading(false);
      }
    };

    checkInitialSession();
  }, [hasFirebase, initDemoUser, loadProfile]);

  const startDemoSession = () => {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("fyza_demo_mode", "true");
    }
    initDemoUser();
  };

  const signIn = async (email: string, password: string) => {
    if (!hasFirebase) {
      initDemoUser();
      return { error: null };
    }

    const auth = getFirebaseAuth();
    if (!auth) {
      initDemoUser();
      return { error: null };
    }

    try {
      const res = await signInWithEmailAndPassword(auth, email, password);
      const mapped = mapFirebaseUser(res.user);
      setUser(mapped);
      setIsDemoMode(false);
      setCookie("fyza_session", true);
      setCookie("fyza_demo_session", false);
      if (typeof localStorage !== "undefined") {
        localStorage.removeItem("fyza_demo_mode");
      }
      const prof = await loadProfile(res.user.uid, res.user.email, res.user.displayName);
      setProfile(prof);
      return { error: null };
    } catch (err: unknown) {
      const message = (err as { message?: string })?.message || "Sign in failed.";
      return { error: message };
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    if (!hasFirebase) {
      initDemoUser();
      fyzaStore.updateProfile({ full_name: fullName, email });
      setProfile(fyzaStore.getProfile());
      return { error: null };
    }

    const auth = getFirebaseAuth();
    if (!auth) {
      initDemoUser();
      return { error: null };
    }

    try {
      const res = await createUserWithEmailAndPassword(auth, email, password);
      await firebaseUpdateProfile(res.user, { displayName: fullName });
      const mapped = mapFirebaseUser(res.user);
      setUser(mapped);
      setIsDemoMode(false);
      setCookie("fyza_session", true);
      setCookie("fyza_demo_session", false);
      if (typeof localStorage !== "undefined") {
        localStorage.removeItem("fyza_demo_mode");
      }

      const prof: Profile = {
        id: res.user.uid,
        email: res.user.email || email,
        full_name: fullName,
        avatar_url: null,
        preferred_currency: "INR",
        locale: "en-IN",
        timezone: "Asia/Kolkata",
        week_start: "monday",
        date_format: "DD/MM/YYYY",
        onboarding_completed: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await upsertUserProfile(prof);
      setProfile(prof);
      return { error: null };
    } catch (err: unknown) {
      const message = (err as { message?: string })?.message || "Account creation failed.";
      return { error: message };
    }
  };

  const signInWithGoogle = async () => {
    if (!hasFirebase) {
      initDemoUser();
      return { error: null };
    }

    const auth = getFirebaseAuth();
    if (!auth) {
      initDemoUser();
      return { error: null };
    }

    try {
      const res = await signInWithPopup(auth, googleProvider);
      const mapped = mapFirebaseUser(res.user);
      setUser(mapped);
      setIsDemoMode(false);
      setCookie("fyza_session", true);
      setCookie("fyza_demo_session", false);
      if (typeof localStorage !== "undefined") {
        localStorage.removeItem("fyza_demo_mode");
      }
      const prof = await loadProfile(res.user.uid, res.user.email, res.user.displayName);
      setProfile(prof);
      return { error: null };
    } catch (err: unknown) {
      const message =
        (err as { message?: string })?.message || "Google sign in was cancelled or failed.";
      return { error: message };
    }
  };

  const signOut = async () => {
    const auth = getFirebaseAuth();
    if (auth) {
      try {
        await firebaseSignOut(auth);
      } catch (err) {
        console.error("SignOut error:", err);
      }
    }
    setCookie("fyza_session", false);
    setCookie("fyza_demo_session", false);
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem("fyza_demo_mode");
    }
    setUser(null);
    setProfile(null);
    setIsDemoMode(false);
  };

  const resetPassword = async (email: string) => {
    if (!hasFirebase) {
      return { error: null };
    }
    const auth = getFirebaseAuth();
    if (!auth) return { error: null };
    try {
      await sendPasswordResetEmail(auth, email);
      return { error: null };
    } catch (err: unknown) {
      const message = (err as { message?: string })?.message || "Failed to send reset email.";
      return { error: message };
    }
  };

  const updateProfile = async (data: Partial<Profile>) => {
    if (!user) return { error: "Not authenticated" };

    if (!hasFirebase || isDemoMode) {
      const updated = fyzaStore.updateProfile(data);
      setProfile(updated);
      return { error: null };
    }

    try {
      const updatedProfile: Profile = {
        ...(profile || (fyzaStore.getProfile() as Profile)),
        ...data,
        id: user.id,
        updated_at: new Date().toISOString(),
      };
      await upsertUserProfile(updatedProfile);
      setProfile(updatedProfile);
      return { error: null };
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
