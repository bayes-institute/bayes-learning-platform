"use client";

import { getApp, getApps, initializeApp } from "firebase/app";
import {
  browserLocalPersistence,
  getAuth,
  GithubAuthProvider,
  GoogleAuthProvider,
  setPersistence,
  signInWithPopup,
  signOut,
  type Auth,
  type UserCredential,
} from "firebase/auth";

const browserFirebaseConfiguration = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

let configuredAuthentication: Promise<Auth> | undefined;

function getBrowserAuthentication(): Auth {
  const firebaseApplication = getApps().length > 0
    ? getApp()
    : initializeApp(browserFirebaseConfiguration);

  return getAuth(firebaseApplication);
}

/**
 * Firebase defaults to local persistence in browsers, but we set it explicitly
 * because a durable learning session is a product requirement, not an accident
 * of an SDK default. This also makes a future persistence-policy change local.
 */
export function getConfiguredBrowserAuthentication(): Promise<Auth> {
  if (!configuredAuthentication) {
    const authentication = getBrowserAuthentication();
    configuredAuthentication = setPersistence(authentication, browserLocalPersistence)
      .then(() => authentication)
      .catch((error: unknown) => {
        configuredAuthentication = undefined;
        throw error;
      });
  }

  return configuredAuthentication;
}

export async function signInWithGooglePopup(): Promise<UserCredential> {
  const authentication = await getConfiguredBrowserAuthentication();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  return signInWithPopup(authentication, provider);
}

export async function signInWithGitHubPopup(): Promise<UserCredential> {
  const authentication = await getConfiguredBrowserAuthentication();
  return signInWithPopup(authentication, new GithubAuthProvider());
}

export async function signOutOfBrowserIdentity(): Promise<void> {
  const authentication = await getConfiguredBrowserAuthentication();
  await signOut(authentication);
}
