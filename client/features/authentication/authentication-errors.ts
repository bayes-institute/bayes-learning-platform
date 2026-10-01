import type { AuthError } from "firebase/auth";

/** A short, actionable message is safer than surfacing provider internals to learners. */
export function describeAuthenticationProblem(error: unknown): string {
  if (!error || typeof error !== "object") {
    return "We could not sign you in. Please try again.";
  }

  const authenticationError = error as AuthError;
  switch (authenticationError.code) {
    case "auth/popup-closed-by-user":
      return "Sign-in was cancelled before it was completed.";
    case "auth/popup-blocked":
      return "Your browser blocked the sign-in window. Please allow popups for this site and try again.";
    case "auth/cancelled-popup-request":
      return "Only one sign-in request can be completed at a time.";
    case "auth/account-exists-with-different-credential":
      return "An account already exists with this email through a different sign-in provider.";
    case "auth/unauthorized-domain":
      return "This domain is not authorised in Firebase Authentication yet.";
    case "auth/operation-not-allowed":
      return "This sign-in provider has not been enabled in Firebase Authentication.";
    case "auth/network-request-failed":
      return "We could not reach the sign-in service. Check your connection and try again.";
    default:
      return authenticationError.message || "We could not sign you in. Please try again.";
  }
}
