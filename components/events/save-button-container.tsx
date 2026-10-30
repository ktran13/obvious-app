"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  saveCommunityAction,
  saveEventAction,
  unsaveCommunityAction,
  unsaveEventAction,
} from "@/app/actions/saves";

import { SaveButton } from "./save-button";

type SaveButtonContainerProps = {
  targetType: "event" | "community";
  targetId: string;
  /** Server-rendered initial state, so the first paint is already correct. */
  initialSaved: boolean;
  signedIn: boolean;
  /** Where the sign-in prompt returns to after signing in. */
  nextPath: string;
};

/**
 * Glue between SaveButton and the save server actions. The sign-in prompt is
 * an affordance, not an auth wall: anonymous visitors see "Sign in to save"
 * and navigating to /signin is the only redirect in the whole browse surface.
 */
export function SaveButtonContainer({
  targetType,
  targetId,
  initialSaved,
  signedIn,
  nextPath,
}: SaveButtonContainerProps) {
  const router = useRouter();
  const [saved, setSaved] = useState(initialSaved);
  const [, startTransition] = useTransition();

  if (!signedIn) {
    return (
      <SaveButton
        state="prompting"
        onSignInClick={() => router.push(`/signin?next=${encodeURIComponent(nextPath)}`)}
      />
    );
  }

  if (saved) {
    return (
      <>
        <WashiTape />
        <SaveButton
          state="saved"
          onUnsave={() =>
            startTransition(async () => {
              setSaved(false);
              const result =
                targetType === "event"
                  ? await unsaveEventAction(targetId)
                  : await unsaveCommunityAction(targetId);
              if (!result.ok) setSaved(true);
              router.refresh();
            })
          }
        />
      </>
    );
  }

  return (
    <SaveButton
      state="idle"
      onSave={() =>
        startTransition(async () => {
          setSaved(true);
          const result =
            targetType === "event"
              ? await saveEventAction(targetId)
              : await saveCommunityAction(targetId);
          if (!result.ok) setSaved(false);
          router.refresh();
        })
      }
    />
  );
}

/**
 * Washi-tape strip pinned across the card's top edge — the saved-state card
 * treatment. Anchors to the nearest positioned ancestor (the Card surface
 * the save button lives in), so it renders only inside cards. Decor only:
 * outside the a11y tree and pointer, so no selector or role query sees it.
 */
function WashiTape() {
  return (
    <span
      aria-hidden
      data-slot="washi-tape"
      className="bg-ink-blue/70 pointer-events-none absolute -top-3 left-1/2 z-10 h-6 w-24 -translate-x-1/2 -rotate-3"
    />
  );
}
