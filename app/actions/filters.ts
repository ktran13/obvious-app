"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";

import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { toEventFilter } from "@/lib/events/params";
import { clearFilterPreferences, saveFilterPreferences } from "@/lib/preferences/queries";
import type { EventFilters } from "@/components/events/types";

/**
 * Server actions behind the /events "Save as my filters" control. Same shape
 * as the save flow in app/actions/saves: the user id always comes from the
 * verified session — never from client input — so an anonymous caller gets
 * { ok: false, reason: "signin" }.
 */

export async function saveMyFiltersAction(filters: EventFilters) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { ok: false as const, reason: "signin" };

  try {
    // toEventFilter runs the client-supplied set through eventFilterSchema —
    // only schema-valid shapes reach the persistence layer.
    await saveFilterPreferences(getDb(), userId, toEventFilter(filters));
  } catch (error) {
    if (error instanceof ZodError) return { ok: false as const, reason: "invalid" };
    throw error;
  }
  revalidatePath("/events");
  return { ok: true as const };
}

export async function clearMyFiltersAction() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { ok: false as const, reason: "signin" };

  await clearFilterPreferences(getDb(), userId);
  revalidatePath("/events");
  return { ok: true as const };
}
