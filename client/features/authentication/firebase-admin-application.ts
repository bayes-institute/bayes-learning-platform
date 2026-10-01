import "server-only";

import {
  applicationDefault,
  cert,
  getApp,
  getApps,
  initializeApp,
  type App,
} from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";

function getLocalFirebaseAdministrationCredential() {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

  const hasAnyLocalCredentialField = Boolean(projectId || clientEmail || privateKey);
  const hasCompleteLocalCredential = Boolean(projectId && clientEmail && privateKey);

  if (hasAnyLocalCredentialField && !hasCompleteLocalCredential) {
    throw new Error(
      "Local Firebase Admin credentials are incomplete. Set all FIREBASE_ADMIN_* variables or use GOOGLE_APPLICATION_CREDENTIALS.",
    );
  }

  return hasCompleteLocalCredential
    ? cert({ projectId, clientEmail, privateKey })
    : applicationDefault();
}

function getFirebaseAdministrationApplication(): App {
  if (getApps().length > 0) return getApp();

  return initializeApp({
    credential: getLocalFirebaseAdministrationCredential(),
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  });
}

/**
 * Cloud Run supplies Application Default Credentials through the service
 * account assigned to this service. Local development can use either an
 * explicit FIREBASE_ADMIN credential triple or GOOGLE_APPLICATION_CREDENTIALS.
 */
export function getFirebaseAdministrationAuthentication(): Auth {
  return getAuth(getFirebaseAdministrationApplication());
}
