/**
 * Auth.js (next-auth v5) configuration.
 *
 * Providers, chosen by environment:
 * - Google OAuth when GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET are set (the
 *   real follow-up — no OAuth secrets exist in dev, so this stays dormant).
 * - A dev-only mock Google provider when AUTH_DEV_MOCK=true AND the process is
 *   not running in production. It signs in a single deterministic user with no
 *   external calls. AUTH_DEV_MOCK must never be set in a deployed environment;
 *   both gates are load-bearing.
 *
 * Sessions are JWTs; the Drizzle adapter still persists users and OAuth
 * account links. Browsing stays anonymous-first — nothing outside the save
 * flow and /profile consults the session.
 */
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";

import { DrizzleAdapter } from "@auth/drizzle-adapter";

import { getDb } from "@/lib/db";
import { accounts, sessions, users } from "@/lib/db/schema";

export const DEV_MOCK_PROVIDER_ID = "google-dev";

/** Deterministic mock identity — same user on every dev sign-in. */
const DEV_MOCK_USER = {
  id: "dev-user-001",
  name: "Dev User",
  email: "dev@nycdiscovery.test",
  image: null,
};

/**
 * Credentials sign-in never runs the adapter's createUser/linkAccount, so the
 * mock provider persists its user and account link itself — exactly what a
 * real OAuth callback does. Without this, saves would fail the
 * saved_items_user_id_users_id_fk foreign key.
 */
async function upsertDevMockUser() {
  const db = getDb();
  await db
    .insert(users)
    .values({ ...DEV_MOCK_USER, emailVerified: null })
    .onConflictDoNothing();
  await db
    .insert(accounts)
    .values({
      userId: DEV_MOCK_USER.id,
      type: "oauth",
      provider: DEV_MOCK_PROVIDER_ID,
      providerAccountId: DEV_MOCK_USER.id,
    })
    .onConflictDoNothing();
}

export const devMockEnabled =
  process.env.AUTH_DEV_MOCK === "true" && process.env.NODE_ENV !== "production";

export const googleOauthConfigured = Boolean(
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
);

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(getDb(), {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
  }),
  // Credentials providers are incompatible with database sessions; the
  // sessions table stays for the future real-Google rollout.
  session: { strategy: "jwt" },
  providers: [
    ...(googleOauthConfigured ? [Google] : []),
    ...(devMockEnabled
      ? [
          Credentials({
            id: DEV_MOCK_PROVIDER_ID,
            name: "Google (Dev Mock)",
            credentials: {},
            authorize: async () => {
              if (!devMockEnabled) return null;
              await upsertDevMockUser();
              return DEV_MOCK_USER;
            },
          }),
        ]
      : []),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) token.sub = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
});
