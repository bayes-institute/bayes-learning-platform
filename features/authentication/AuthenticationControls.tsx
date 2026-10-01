"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createSignInPath } from "./return-path";
import { useAuthentication } from "./AuthenticationProvider";
import styles from "./authentication-ui.module.css";

function getDisplayName(name: string | null, email: string | null): string {
  return name || email?.split("@")[0] || "Scholar";
}

export function AuthenticationControls() {
  const { currentUser, isAuthenticationLoading, signOut } = useAuthentication();
  const pathname = usePathname();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuReference = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function closeMenuWhenFocusLeaves(event: MouseEvent) {
      if (menuReference.current && !menuReference.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }

    function closeMenuOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setIsMenuOpen(false);
    }

    document.addEventListener("mousedown", closeMenuWhenFocusLeaves);
    document.addEventListener("keydown", closeMenuOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeMenuWhenFocusLeaves);
      document.removeEventListener("keydown", closeMenuOnEscape);
    };
  }, []);

  if (isAuthenticationLoading) {
    return <div className={styles.loadingPlaceholder} aria-label="Checking your sign-in status" />;
  }

  if (!currentUser) {
    return (
      <Link className={`button button-outline masthead-action ${styles.signInLink}`} href={createSignInPath(pathname)}>
        Sign in
      </Link>
    );
  }

  const displayName = getDisplayName(currentUser.displayName, currentUser.email);
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className={styles.userMenu} ref={menuReference}>
      <button
        type="button"
        className={styles.userTrigger}
        onClick={() => setIsMenuOpen((isOpen) => !isOpen)}
        aria-expanded={isMenuOpen}
        aria-haspopup="menu"
      >
        {currentUser.photoURL ? (
          <Image className={styles.avatar} src={currentUser.photoURL} alt="" width={26} height={26} unoptimized />
        ) : (
          <span className={styles.initial} aria-hidden="true">{initial}</span>
        )}
        <span className={styles.userName}>{displayName}</span>
        <span aria-hidden="true" className={styles.caret}>▾</span>
      </button>

      {isMenuOpen && (
        <div className={styles.menu} role="menu">
          <p className={styles.menuName}>{displayName}</p>
          {currentUser.email && <p className={styles.menuEmail}>{currentUser.email}</p>}
          <div className={styles.divider} />
          <Link className={styles.menuLink} href="/learn" role="menuitem" onClick={() => setIsMenuOpen(false)}>
            My learning
          </Link>
          <button
            className={styles.signOutButton}
            type="button"
            role="menuitem"
            onClick={async () => {
              setIsMenuOpen(false);
              await signOut();
              router.replace("/");
              router.refresh();
            }}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
