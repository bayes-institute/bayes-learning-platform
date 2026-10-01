"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import AuthModal from "./AuthModal";

export default function AuthButton() {
  const { user, loading, signOut } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (loading) {
    return (
      <div className="auth-btn-skeleton" aria-label="Loading authentication state" />
    );
  }

  if (!user) {
    return (
      <>
        <button
          type="button"
          className="button button-outline masthead-action auth-trigger-btn"
          onClick={() => setModalOpen(true)}
        >
          Sign in
        </button>
        <AuthModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
      </>
    );
  }

  // Get user display label and initial
  const displayName = user.displayName || user.email?.split("@")[0] || "Scholar";
  const initial = (displayName[0] || "B").toUpperCase();

  return (
    <div className="auth-user-menu" ref={dropdownRef}>
      <button
        type="button"
        className="auth-user-pill"
        onClick={() => setDropdownOpen((prev) => !prev)}
        aria-expanded={dropdownOpen}
        aria-haspopup="true"
      >
        {user.photoURL ? (
          <Image
            src={user.photoURL}
            alt={displayName}
            width={24}
            height={24}
            className="auth-user-avatar"
            unoptimized
          />
        ) : (
          <span className="auth-user-initial" aria-hidden="true">
            {initial}
          </span>
        )}
        <span className="auth-user-name">{displayName}</span>
        <span className="auth-user-caret" aria-hidden="true">
          ▾
        </span>
      </button>

      {dropdownOpen && (
        <div className="auth-dropdown-card" role="menu">
          <div className="auth-dropdown-info">
            <p className="auth-dropdown-name">{displayName}</p>
            {user.email && <p className="auth-dropdown-email">{user.email}</p>}
          </div>
          <div className="auth-dropdown-divider" />
          <button
            type="button"
            className="auth-dropdown-signout"
            role="menuitem"
            onClick={async () => {
              setDropdownOpen(false);
              await signOut();
            }}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
