"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      type="button"
      data-slot="sign-out"
      onClick={() => signOut()}
      className="border-border bg-background hover:bg-muted inline-flex h-9 items-center justify-center rounded-lg border px-4 text-sm font-medium"
    >
      Sign out
    </button>
  );
}
