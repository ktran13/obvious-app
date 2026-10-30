"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { saveCommunity, saveEvent, unsaveCommunity, unsaveEvent } from "@/lib/saves/queries";

/**
 * Server actions behind the save buttons. The user id always comes from the
 * verified session — never from client input — so an anonymous caller gets
 * { ok: false, reason: "signin" } and the UI shows the sign-in affordance.
 */
async function requireUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

export async function saveEventAction(eventId: string) {
  const userId = await requireUserId();
  if (!userId) return { ok: false as const, reason: "signin" };
  await saveEvent(getDb(), userId, eventId);
  revalidatePath("/profile");
  return { ok: true as const };
}

export async function unsaveEventAction(eventId: string) {
  const userId = await requireUserId();
  if (!userId) return { ok: false as const, reason: "signin" };
  await unsaveEvent(getDb(), userId, eventId);
  revalidatePath("/profile");
  return { ok: true as const };
}

export async function saveCommunityAction(communityId: string) {
  const userId = await requireUserId();
  if (!userId) return { ok: false as const, reason: "signin" };
  await saveCommunity(getDb(), userId, communityId);
  revalidatePath("/profile");
  return { ok: true as const };
}

export async function unsaveCommunityAction(communityId: string) {
  const userId = await requireUserId();
  if (!userId) return { ok: false as const, reason: "signin" };
  await unsaveCommunity(getDb(), userId, communityId);
  revalidatePath("/profile");
  return { ok: true as const };
}
