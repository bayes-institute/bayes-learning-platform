"use client";

import { getApp, getApps, initializeApp } from "firebase/app";
import { getAnalytics, isSupported, type Analytics } from "firebase/analytics";

const browserFirebaseConfiguration = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

let browserAnalytics: Analytics | null = null;

export async function startBrowserAnalytics(): Promise<Analytics | null> {
  if (typeof window === "undefined") return null;
  if (browserAnalytics) return browserAnalytics;
  if (!(await isSupported())) return null;

  const firebaseApplication = getApps().length > 0
    ? getApp()
    : initializeApp(browserFirebaseConfiguration);
  browserAnalytics = getAnalytics(firebaseApplication);
  return browserAnalytics;
}
