"use client";

import { useEffect } from "react";
import { startBrowserAnalytics } from "./analytics-client";

export function FirebaseAnalytics() {
  useEffect(() => {
    void startBrowserAnalytics();
  }, []);

  return null;
}
