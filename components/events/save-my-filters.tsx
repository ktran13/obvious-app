"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { clearMyFiltersAction, saveMyFiltersAction } from "@/app/actions/filters";
import { cn } from "cn";

import type { EventFilters } from "./types";

type SaveMyFiltersProps = {
  /** The filter set currently rendered from the URL — what "save" snapshots. */
  filters: EventFilters;
  /** Server-rendered: the user already has a saved set (shows Clear). */
  hasSaved: boolean;
  className?: string;
};

const buttonClass =
  "h-8 rounded-lg border border-border bg-background px-3 text-sm font-medium hover:bg-accent disabled:opacity-50";

/**
 * "Save as my filters" control for signed-in /events visitors. Persists the
 * current URL filter set (day included) to user_filter_preferences and offers
 * clearing it. Signed-out users never see this control — the page renders it
 * only inside a session, keeping the anonymous surface URL-only.
 */
export function SaveMyFilters({ filters, hasSaved, className }: SaveMyFiltersProps) {
  const router = useRouter();
  const [saved, setSaved] = useState(hasSaved);
  const [pending, startTransition] = useTransition();

  return (
    <div data-slot="save-my-filters" className={cn("flex items-center gap-3", className)}>
      <button
        type="button"
        disabled={pending}
        className={buttonClass}
        onClick={() =>
          startTransition(async () => {
            const result = await saveMyFiltersAction(filters);
            if (result.ok) {
              setSaved(true);
              router.refresh();
            }
          })
        }
      >
        {saved ? "Update saved filters" : "Save as my filters"}
      </button>

      {saved && (
        <button
          type="button"
          disabled={pending}
          className="text-muted-foreground text-sm underline-offset-4 hover:underline disabled:opacity-50"
          onClick={() =>
            startTransition(async () => {
              const result = await clearMyFiltersAction();
              if (result.ok) {
                setSaved(false);
                router.refresh();
              }
            })
          }
        >
          Clear saved filters
        </button>
      )}
    </div>
  );
}
