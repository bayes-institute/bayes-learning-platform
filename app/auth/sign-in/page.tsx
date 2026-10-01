import type { Metadata } from "next";
import Link from "next/link";
import { SignInForm } from "@/features/authentication/SignInForm";
import { getSafeReturnPath } from "@/features/authentication/return-path";
import styles from "./sign-in-page.module.css";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string | string[] }>;
}) {
  const parameters = await searchParams;
  const returnTo = getSafeReturnPath(
    typeof parameters.returnTo === "string" ? parameters.returnTo : undefined,
  );

  return (
    <>
      <Link className={styles.homeLink} href="/">← Bayes Institute</Link>
      <SignInForm returnTo={returnTo} />
    </>
  );
}
