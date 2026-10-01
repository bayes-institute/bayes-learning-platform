import { NextRequest, NextResponse } from "next/server";
import {
  AuthenticationInfrastructureError,
  createRollingSessionCookie,
  RecentAuthenticationRequiredError,
} from "@/features/authentication/server-session-identity";
import {
  sessionCookieName,
  sessionInactivityWindowMilliseconds,
} from "@/features/authentication/session-policy";

export const runtime = "nodejs";

function isSameOriginBrowserRequest(request: NextRequest): boolean {
  const requestOrigin = request.headers.get("origin");
  const expectedOrigin = new URL(request.url).origin;

  return request.headers.get("x-requested-with") === "BayesInstitute"
    && (!requestOrigin || requestOrigin === expectedOrigin);
}

function getBearerToken(request: NextRequest): string | null {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return null;
  return authorization.slice("Bearer ".length).trim() || null;
}

function protectedResponse(body: object, status: number): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!isSameOriginBrowserRequest(request)) {
    return protectedResponse({ message: "This session request must come from this site." }, 403);
  }

  const identityToken = getBearerToken(request);
  if (!identityToken) {
    return protectedResponse({ reason: "invalid-identity-token", message: "A Firebase identity token is required." }, 401);
  }

  try {
    const sessionCookie = await createRollingSessionCookie(identityToken);
    const response = protectedResponse({ authenticated: true }, 200);
    response.cookies.set({
      name: sessionCookieName,
      value: sessionCookie,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: Math.floor(sessionInactivityWindowMilliseconds / 1000),
    });
    return response;
  } catch (error) {
    if (error instanceof RecentAuthenticationRequiredError) {
      return protectedResponse({ reason: "recent-login-required", message: error.message }, 401);
    }

    if (error instanceof AuthenticationInfrastructureError) {
      return protectedResponse({ reason: "session-not-created", message: "The authentication service is not configured yet. Please try again shortly." }, 503);
    }

    return protectedResponse({ reason: "invalid-identity-token", message: "We could not verify your sign-in." }, 401);
  }
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  if (!isSameOriginBrowserRequest(request)) {
    return protectedResponse({ message: "This session request must come from this site." }, 403);
  }

  const response = protectedResponse({ authenticated: false }, 200);
  response.cookies.set({
    name: sessionCookieName,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
