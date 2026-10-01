"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, type User, type UserCredential } from "firebase/auth";
import {
  getConfiguredBrowserAuthentication,
  signInWithGitHubPopup,
  signInWithGooglePopup,
  signOutOfBrowserIdentity,
} from "./browser-identity";
import { createOrRenewServerSession, removeServerSession } from "./server-session-client";

interface AuthenticationContextValue {
  currentUser: User | null;
  isAuthenticationLoading: boolean;
  signInWithGoogle: () => Promise<UserCredential>;
  signInWithGitHub: () => Promise<UserCredential>;
  restoreServerSession: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthenticationContext = createContext<AuthenticationContextValue | undefined>(undefined);

export function AuthenticationProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthenticationLoading, setIsAuthenticationLoading] = useState(true);

  useEffect(() => {
    let isCurrent = true;
    let unsubscribe: () => void = () => undefined;

    async function beginObservingIdentity() {
      const authentication = await getConfiguredBrowserAuthentication();
      // Token refreshes are intentionally not observed here. The activity keeper
      // must be the only mechanism that extends a server session; otherwise an
      // idle tab could renew its cookie indefinitely in the background.
      unsubscribe = onAuthStateChanged(
        authentication,
        (nextUser) => {
          if (!isCurrent) return;
          setCurrentUser(nextUser);
          setIsAuthenticationLoading(false);
        },
        () => {
          if (isCurrent) setIsAuthenticationLoading(false);
        },
      );
    }

    beginObservingIdentity().catch(() => {
      if (isCurrent) setIsAuthenticationLoading(false);
    });

    return () => {
      isCurrent = false;
      unsubscribe();
    };
  }, []);

  const completeSignIn = useCallback(async (signIn: () => Promise<UserCredential>) => {
    const credential = await signIn();
    try {
      await createOrRenewServerSession();
      return credential;
    } catch (error) {
      // Do not leave a browser-only Firebase login behind when the server could not secure it.
      await signOutOfBrowserIdentity();
      throw error;
    }
  }, []);

  const signInWithGoogle = useCallback(
    () => completeSignIn(signInWithGooglePopup),
    [completeSignIn],
  );

  const signInWithGitHub = useCallback(
    () => completeSignIn(signInWithGitHubPopup),
    [completeSignIn],
  );

  const signOut = useCallback(async () => {
    try {
      await removeServerSession();
    } finally {
      await signOutOfBrowserIdentity();
    }
  }, []);

  const value = useMemo<AuthenticationContextValue>(() => ({
    currentUser,
    isAuthenticationLoading,
    signInWithGoogle,
    signInWithGitHub,
    restoreServerSession: createOrRenewServerSession,
    signOut,
  }), [currentUser, isAuthenticationLoading, signInWithGoogle, signInWithGitHub, signOut]);

  return <AuthenticationContext.Provider value={value}>{children}</AuthenticationContext.Provider>;
}

export function useAuthentication(): AuthenticationContextValue {
  const context = useContext(AuthenticationContext);
  if (!context) {
    throw new Error("useAuthentication must be used inside AuthenticationProvider.");
  }

  return context;
}
