// src/hooks/useAuth.ts

"use client";

import { useState, useEffect, useCallback } from "react";
import { 
  onAuthChange, 
  signInWithGoogle, 
  signInWithGithub,
  signInWithEmail,
  signUpWithEmail,
  signOut,
  createUserProfile,
  getUserProfile,
  type FirebaseUser 
} from "@/lib/firebase";
import type { User } from "@/types";

interface AuthState {
  firebaseUser: FirebaseUser | null;
  user: User | null;
  loading: boolean;
  error: string | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    firebaseUser: null,
    user: null,
    loading: true,
    error: null,
  });

  // Listen to auth state changes
  useEffect(() => {
    const unsubscribe = onAuthChange(async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Ensure user profile exists
          await createUserProfile(firebaseUser);
          const profile = await getUserProfile(firebaseUser.uid);
          
          setState({
            firebaseUser,
            user: profile as User,
            loading: false,
            error: null,
          });
        } catch (err) {
          console.error("Error loading user profile:", err);
          setState({
            firebaseUser,
            user: null,
            loading: false,
            error: "Failed to load user profile",
          });
        }
      } else {
        setState({
          firebaseUser: null,
          user: null,
          loading: false,
          error: null,
        });
      }
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      await signInWithGoogle();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Google login failed";
      setState((prev) => ({ ...prev, loading: false, error: message }));
    }
  }, []);

  const loginWithGithub = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      await signInWithGithub();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "GitHub login failed";
      setState((prev) => ({ ...prev, loading: false, error: message }));
    }
  }, []);

  const loginWithEmail = useCallback(async (email: string, password: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      await signInWithEmail(email, password);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Email login failed";
      setState((prev) => ({ ...prev, loading: false, error: message }));
      throw err;
    }
  }, []);

  const registerWithEmail = useCallback(async (email: string, password: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      await signUpWithEmail(email, password);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Registration failed";
      setState((prev) => ({ ...prev, loading: false, error: message }));
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await signOut();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Logout failed";
      setState((prev) => ({ ...prev, error: message }));
    }
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    isAuthenticated: !!state.firebaseUser,
    loginWithGoogle,
    loginWithGithub,
    loginWithEmail,
    registerWithEmail,
    logout,
    clearError,
  };
}