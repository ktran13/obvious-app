"use client";

import { Check } from "lucide-react";

import { cn } from "cn";

import type { SaveState } from "./types";

type SaveButtonProps = {
  state?: SaveState;
  onSave?: () => void;
  /** Clicked while prompting: the visitor is signed out. */
  onSignInClick?: () => void;
  className?: string;
};

/**
 * Save affordance with three states driven entirely by props:
 * idle (save offered), prompting (signed out — sign-in nudge), saved.
 * The parent owns the sign-in flow; this component never fetches.
 */
export function SaveButton({
  state = "idle",
  onSave,
  onSignInClick,
  className,
}: SaveButtonProps) {
  if (state === "saved") {
    return (
      <button
        type="button"
        aria-pressed="true"
        data-slot="save-button"
        data-state="saved"
        className={cn(
          "inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground",
          className,
        )}
      >
        <Check aria-hidden className="size-4" />
        Saved
      </button>
    );
  }

  if (state === "prompting") {
    return (
      <button
        type="button"
        data-slot="save-button"
        data-state="prompting"
        onClick={onSignInClick}
        className={cn(
          "inline-flex h-8 items-center rounded-lg border border-primary/40 bg-primary/10 px-2.5 text-sm font-medium text-primary",
          className,
        )}
      >
        Sign in to save
      </button>
    );
  }

  return (
    <button
      type="button"
      data-slot="save-button"
      data-state="idle"
      onClick={onSave}
      className={cn(
        "inline-flex h-8 items-center rounded-lg border border-border bg-background px-2.5 text-sm font-medium hover:bg-muted",
        className,
      )}
    >
      Save
    </button>
  );
}
