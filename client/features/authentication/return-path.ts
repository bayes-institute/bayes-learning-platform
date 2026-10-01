/**
 * Authentication redirects are user-controlled input. Restricting return paths
 * to site-relative paths prevents a successful sign-in from becoming an open
 * redirect to a phishing domain.
 */
export function getSafeReturnPath(candidate: string | null | undefined): string {
  if (!candidate || !candidate.startsWith("/") || candidate.startsWith("//")) {
    return "/learn";
  }

  return candidate;
}

export function createSignInPath(returnPath: string): string {
  return `/auth/sign-in?returnTo=${encodeURIComponent(getSafeReturnPath(returnPath))}`;
}
