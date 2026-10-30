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
        onSignInClick={() =>
          router.push(`/signin?next=${encodeURIComponent(nextPath)}`)
        }
      />
    );
  }

  if (saved) {
    return (
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
