import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthenticatedSessionUser } from "@/features/authentication/server-session-identity";
import { createSignInPath } from "@/features/authentication/return-path";
import { LearningDashboard } from "@/features/learning/LearningDashboard";

export const metadata: Metadata = {
  title: "Your learning dashboard",
  robots: { index: false, follow: false },
};

/** Check the session before rendering any learner content. */
export default async function LearnPage() {
  const sessionUser = await getAuthenticatedSessionUser();
  if (!sessionUser) redirect(createSignInPath("/learn"));

  const learnerName = sessionUser.name || sessionUser.email?.split("@")[0] || "Scholar";

  return <LearningDashboard learnerName={learnerName} />;
}
