import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      /** Auth.js users.id — the key saved_items references. */
      id: string;
    } & DefaultSession["user"];
  }
}
