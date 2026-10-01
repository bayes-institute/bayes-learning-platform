import "server-only";

import { cert, getApp, getApps, initializeApp } from "firebase-admin/app";
import { getAuth, type Auth, type DecodedIdToken } from "firebase-admin/auth";
import { cookies } from "next/headers";
import {
  recentAuthenticationWindowMilliseconds,
  sessionCookieName,
  sessionInactivityWindowMilliseconds,
} from "./session-policy";

export type AuthenticatedSessionUser = Pick<DecodedIdToken, "uid" | "email" | "name" | "picture">;

function getServerAuthentication(): Auth {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new AuthenticationInfrastructureError(
      "Firebase Admin credentials are missing. Set FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, and FIREBASE_ADMIN_PRIVATE_KEY before enabling protected routes.",
    );
  }

  const administrationApplication = getApps().length > 0
    ? getApp()
    : initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });

  return getAuth(administrationApplication);
}

export async function getAuthenticatedSessionUser(): Promise<AuthenticatedSessionUser | null> {
  const sessionCookie = (await cookies()).get(sessionCookieName)?.value;
  if (!sessionCookie) return null;

  const authentication = getServerAuthentication();

  try {
    // checkRevoked keeps an explicitly revoked Firebase identity from retaining a server cookie.
    const decodedSession = await authentication.verifySessionCookie(sessionCookie, true);
    return {
      uid: decodedSession.uid,
      email: decodedSession.email,
      name: decodedSession.name,
      picture: decodedSession.picture,
    };
  } catch {
    // An invalid or expired cookie is an ordinary unauthenticated state, not a 500.
    return null;
  }
}

export async function createRollingSessionCookie(identityToken: string): Promise<string> {
  const authentication = getServerAuthentication();
  const decodedIdentity = await authentication.verifyIdToken(identityToken, true);
  const existingSessionCookie = (await cookies()).get(sessionCookieName)?.value;
  let hasExistingValidSession = false;

  if (existingSessionCookie) {
    try {
      await authentication.verifySessionCookie(existingSessionCookie, true);
      hasExistingValidSession = true;
    } catch {
      hasExistingValidSession = false;
    }
  }

  /**
   * A stale client-side Firebase login must not silently bootstrap a new server
   * session after this site's inactivity window has elapsed. A valid server
   * cookie may renew normally; a first cookie must come from a recent popup.
   */
  const signedInAtMilliseconds = decodedIdentity.auth_time * 1000;
  if (!hasExistingValidSession && Date.now() - signedInAtMilliseconds > recentAuthenticationWindowMilliseconds) {
    throw new RecentAuthenticationRequiredError();
  }

  return authentication.createSessionCookie(identityToken, {
    expiresIn: sessionInactivityWindowMilliseconds,
  });
}

export class RecentAuthenticationRequiredError extends Error {
  constructor() {
    super("Your secure session has expired. Please sign in again.");
    this.name = "RecentAuthenticationRequiredError";
  }
}

export class AuthenticationInfrastructureError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthenticationInfrastructureError";
  }
}
