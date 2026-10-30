"use client";

import { Check } from "lucide-react";

import { cn } from "cn";

import type { SaveState } from "./types";

type SaveButtonProps = {
  state?: SaveState;
  onSave?: () => void;
  /** Clicked while prompting: the visitor is signed out. */
  onSignInClick?: () => void;
  /** Clicked while saved: toggles the save off. No-op when omitted. */
  onUnsave?: () => void;
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
  onUnsave,
  className,
}: SaveButtonProps) {
  if (state === "saved") {
    return (
      <button
        type="button"
        aria-pressed="true"
        data-slot="save-button"
        data-state="saved"
        onClick={onUnsave}
        className={cn(
          "bg-primary text-primary-foreground inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium",
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
          "border-primary/40 bg-primary/10 text-primary inline-flex h-8 items-center rounded-lg border px-2.5 text-sm font-medium",
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
        "border-border bg-background hover:bg-muted inline-flex h-8 items-center rounded-lg border px-2.5 text-sm font-medium",
        className,
      )}
    >
      Save
    </button>
  );
}
