import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  onIdTokenChanged,
  type User,
  type UserCredential,
  type AuthError,
  type Unsubscribe,
} from "firebase/auth";
import { auth, googleProvider, githubProvider } from "./firebase";

/**
 * Sign in with Google using a popup window
 */
export async function signInWithGoogle(): Promise<UserCredential> {
  return await signInWithPopup(auth, googleProvider);
}

/**
 * Sign in with GitHub using a popup window
 */
export async function signInWithGithub(): Promise<UserCredential> {
  return await signInWithPopup(auth, githubProvider);
}

/**
 * Sign out the currently authenticated user
 */
export async function signOutUser(): Promise<void> {
  await signOut(auth);
}

/**
 * Subscribe to authentication state changes (sign-in, sign-out, session restoration)
 * @param callback Function called whenever auth state changes
 * @param errorCallback Optional error handler
 * @returns Unsubscribe function
 */
export function subscribeToAuthState(
  callback: (user: User | null) => void,
  errorCallback?: (error: Error) => void
): Unsubscribe {
  return onAuthStateChanged(auth, callback, errorCallback);
}

/**
 * Subscribe to ID token changes (triggers on sign-in, sign-out, and periodic token refresh)
 * @param callback Function called whenever ID token changes
 * @param errorCallback Optional error handler
 * @returns Unsubscribe function
 */
export function subscribeToIdToken(
  callback: (user: User | null) => void,
  errorCallback?: (error: Error) => void
): Unsubscribe {
  return onIdTokenChanged(auth, callback, errorCallback);
}

/**
 * Get the current user's Firebase JWT ID token
 */
export async function getIdToken(forceRefresh = false): Promise<string | null> {
  if (!auth.currentUser) return null;
  return await auth.currentUser.getIdToken(forceRefresh);
}

/**
 * Friendly error messages for common Firebase authentication error codes
 */
export function getAuthErrorMessage(error: unknown): string {
  if (!error || typeof error !== "object") {
    return "An unexpected error occurred. Please try again.";
  }

  const authError = error as AuthError;
  switch (authError.code) {
    case "auth/popup-closed-by-user":
      return "Sign-in was cancelled before completion.";
    case "auth/popup-blocked":
      return "The sign-in popup was blocked by your browser. Please allow popups for this site.";
    case "auth/cancelled-popup-request":
      return "Only one sign-in request can be handled at a time.";
    case "auth/account-exists-with-different-credential":
      return "An account already exists with the same email using a different sign-in provider.";
    case "auth/unauthorized-domain":
      return "This domain is not authorized in your Firebase Authentication settings.";
    case "auth/operation-not-allowed":
      return "This sign-in provider is not enabled in Firebase Console.";
    case "auth/network-request-failed":
      return "A network error occurred. Please check your internet connection.";
    default:
      return authError.message || "Failed to sign in. Please try again.";
  }
}
