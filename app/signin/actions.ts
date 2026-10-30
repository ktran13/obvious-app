"use server";

import { redirect } from "next/navigation";

import { DEV_MOCK_PROVIDER_ID, googleOauthConfigured, devMockEnabled, signIn } from "@/lib/auth";

/**
 * Sign-in entry points for the /signin page. Auth.js v5 `signIn` runs on the
 * server in actions and redirects to `redirectTo` on success. If the chosen
 * provider is not available, the form falls back to the unconfigured state.
 */
export async function signInWithDevMock(nextPath: string) {
  if (!devMockEnabled) redirect("/signin?unavailable=1");
  await signIn(DEV_MOCK_PROVIDER_ID, { redirectTo: nextPath });
}

export async function signInWithGoogle(nextPath: string) {
  if (!googleOauthConfigured) redirect("/signin?unavailable=1");
  await signIn("google", { redirectTo: nextPath });
}
