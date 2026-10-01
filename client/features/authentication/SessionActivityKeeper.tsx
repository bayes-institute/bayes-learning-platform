"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createSignInPath } from "./return-path";
import { ServerSessionError } from "./server-session-client";
import { sessionRenewalThrottleMilliseconds } from "./session-policy";
import { useAuthentication } from "./AuthenticationProvider";

const activityEvents: Array<keyof WindowEventMap> = ["pointerdown", "keydown", "scroll", "focus"];

/**
 * This component has no visual output. It renews the server cookie only after
 * real user interaction, which makes the cookie's expiry an inactivity limit
 * instead of a timer kept alive by a background tab or an SDK token refresh.
 */
export function SessionActivityKeeper() {
  const { currentUser, isAuthenticationLoading, restoreServerSession, signOut } = useAuthentication();
  const router = useRouter();
  const pathname = usePathname();
  const lastRenewalAt = useRef(0);

  useEffect(() => {
    if (isAuthenticationLoading || !currentUser) return;

    let isMounted = true;

    async function renewSessionAfterActivity() {
      if (Date.now() - lastRenewalAt.current < sessionRenewalThrottleMilliseconds) return;

      lastRenewalAt.current = Date.now();
      try {
        await restoreServerSession();
      } catch (error) {
        if (!isMounted || !(error instanceof ServerSessionError) || error.reason !== "recent-login-required") return;

        await signOut().catch(() => undefined);
        if (pathname.startsWith("/learn")) {
          router.replace(createSignInPath(pathname));
        }
      }
    }

    void renewSessionAfterActivity();
    activityEvents.forEach((eventName) => window.addEventListener(eventName, renewSessionAfterActivity, { passive: true }));

    return () => {
      isMounted = false;
      activityEvents.forEach((eventName) => window.removeEventListener(eventName, renewSessionAfterActivity));
    };
  }, [currentUser, isAuthenticationLoading, pathname, restoreServerSession, router, signOut]);

  return null;
}
