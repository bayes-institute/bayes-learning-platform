"use client";

import { getConfiguredBrowserAuthentication } from "@/features/authentication/browser-identity";

export class ServerApiAuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ServerApiAuthenticationError";
  }
}

function getConfiguredServerApiOrigin(): string {
  const configuredOrigin = process.env.NEXT_PUBLIC_SERVER_API_ORIGIN?.trim();
  if (!configuredOrigin) {
    throw new ServerApiAuthenticationError(
      "NEXT_PUBLIC_SERVER_API_ORIGIN must identify the FastAPI service.",
    );
  }

  return configuredOrigin.replace(/\/$/, "");
}

function createServerApiUrl(path: string): string {
  if (!path.startsWith("/")) {
    throw new ServerApiAuthenticationError("Server API paths must start with a slash.");
  }

  return new URL(path, getConfiguredServerApiOrigin()).toString();
}

/**
 * Sends a Firebase bearer token directly from the browser to FastAPI. This
 * intentionally does not proxy through Next.js: FastAPI is responsible for
 * verifying the token and authorizing its privileged operation.
 */
export async function sendAuthenticatedServerRequest(
  path: string,
  requestOptions: RequestInit = {},
): Promise<Response> {
  const browserAuthentication = await getConfiguredBrowserAuthentication();
  const currentUser = browserAuthentication.currentUser;
  if (!currentUser) {
    throw new ServerApiAuthenticationError("Sign in before calling the server API.");
  }

  const identityToken = await currentUser.getIdToken();
  const requestHeaders = new Headers(requestOptions.headers);
  requestHeaders.set("Authorization", "Bearer " + identityToken);

  return fetch(createServerApiUrl(path), {
    ...requestOptions,
    headers: requestHeaders,
    credentials: "omit",
    cache: "no-store",
  });
}
