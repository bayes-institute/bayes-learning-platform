import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthenticatedSessionUser } from "@/features/authentication/server-session-identity";
import { createSignInPath } from "@/features/authentication/return-path";
import { AuthenticationControls } from "@/features/authentication/AuthenticationControls";
import styles from "./learn.module.css";

export const metadata: Metadata = {
  title: "Your learning library",
  robots: { index: false, follow: false },
};

/**
 * This check runs on the server, before any course content is rendered. Client
 * UI guards are useful for navigation polish, but they do not constitute access
 * control because a visitor can bypass JavaScript and request a URL directly.
 */
export default async function LearnPage() {
  const sessionUser = await getAuthenticatedSessionUser();
  if (!sessionUser) redirect(createSignInPath("/learn"));

  const learnerName = sessionUser.name || sessionUser.email?.split("@")[0] || "Scholar";

  return (
    <main className={styles.page}>
      <div className={`page-shell ${styles.shell}`}>
        <header className={styles.header}>
          <Link href="/" aria-label="Bayes Institute home">
            <Image src="/assets/logos/svg/full-logo/primary.svg" alt="Bayes Institute" width={170} height={72} unoptimized />
          </Link>
          <AuthenticationControls />
        </header>

        <section className={styles.introduction} aria-labelledby="library-title">
          <p className="eyebrow"><span className="eyebrow-mark" /> Your library</p>
          <h1 id="library-title">Welcome back, <em>{learnerName}.</em></h1>
          <p>This is your protected learning space. Your lessons, progress, and notes will live here.</p>
        </section>

        <section className={styles.placeholder} aria-labelledby="next-step-title">
          <p className={styles.index}>B / 01</p>
          <div>
            <p className="eyebrow"><span className="eyebrow-mark" /> Ready when you are</p>
            <h2 id="next-step-title">The foundation is in place.</h2>
            <p>Build your first course module here, knowing that its route is verified before it reaches a learner.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
