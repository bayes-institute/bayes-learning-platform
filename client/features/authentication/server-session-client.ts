"use client";

import { getConfiguredBrowserAuthentication } from "./browser-identity";

type SessionEndpointFailureReason =
  | "recent-login-required"
  | "invalid-identity-token"
  | "session-not-created"
  | "unexpected-response";

export class ServerSessionError extends Error {
  constructor(
    public readonly reason: SessionEndpointFailureReason,
    message: string,
  ) {
    super(message);
    this.name = "ServerSessionError";
  }
}

let sessionRenewalInFlight: Promise<void> | undefined;

/**
 * Exchanges the Firebase ID token for an HttpOnly cookie. JavaScript never sees
 * the cookie value; it can only ask this same-origin endpoint to set or renew it.
 */
export function createOrRenewServerSession(): Promise<void> {
  if (!sessionRenewalInFlight) {
    sessionRenewalInFlight = requestServerSession().finally(() => {
      sessionRenewalInFlight = undefined;
    });
  }

  return sessionRenewalInFlight;
}

async function requestServerSession(): Promise<void> {
  const authentication = await getConfiguredBrowserAuthentication();
  const currentUser = authentication.currentUser;

  if (!currentUser) {
    throw new ServerSessionError("invalid-identity-token", "There is no signed-in user to secure.");
  }

  const identityToken = await currentUser.getIdToken();
  const response = await fetch("/api/auth/session", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${identityToken}`,
      "X-Requested-With": "BayesInstitute",
    },
    credentials: "same-origin",
    cache: "no-store",
  });

  if (response.ok) return;

  const payload = await response.json().catch(() => null) as { reason?: string; message?: string } | null;
  const reason = payload?.reason === "recent-login-required"
    ? "recent-login-required"
    : payload?.reason === "invalid-identity-token"
      ? "invalid-identity-token"
      : "session-not-created";

  throw new ServerSessionError(
    reason,
    payload?.message ?? "We could not establish a secure server session.",
  );
}

/** Deleting a cookie is intentionally server-side so its HttpOnly protection remains intact. */
export async function removeServerSession(): Promise<void> {
  const response = await fetch("/api/auth/session", {
    method: "DELETE",
    headers: { "X-Requested-With": "BayesInstitute" },
    credentials: "same-origin",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new ServerSessionError("unexpected-response", "We could not close the secure server session.");
  }
}
