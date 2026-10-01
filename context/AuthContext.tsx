"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { type User, type UserCredential } from "firebase/auth";
import {
  signInWithGoogle,
  signInWithGithub,
  signOutUser,
  subscribeToAuthState,
  getIdToken,
} from "@/lib/auth";
import { getFirebaseAnalytics } from "@/lib/firebase";
import { setUserId } from "firebase/analytics";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<UserCredential>;
  signInWithGithub: () => Promise<UserCredential>;
  signOut: () => Promise<void>;
  getIdToken: (forceRefresh?: boolean) => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Primary auth listener: triggers on sign-in, sign-out, and initial session restoration
    const unsubscribe = subscribeToAuthState(
      (currentUser) => {
        setUser(currentUser);
        setLoading(false);

        // Sync with Firebase Analytics if active
        getFirebaseAnalytics().then((analytics) => {
          if (analytics) {
            setUserId(analytics, currentUser ? currentUser.uid : null);
          }
        });
      },
      (error) => {
        console.error("Firebase auth state listener error:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleSignInWithGoogle = async () => {
    return await signInWithGoogle();
  };

  const handleSignInWithGithub = async () => {
    return await signInWithGithub();
  };

  const handleSignOut = async () => {
    await signOutUser();
  };

  const handleGetIdToken = async (forceRefresh = false) => {
    return await getIdToken(forceRefresh);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signInWithGoogle: handleSignInWithGoogle,
        signInWithGithub: handleSignInWithGithub,
        signOut: handleSignOut,
        getIdToken: handleGetIdToken,
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
