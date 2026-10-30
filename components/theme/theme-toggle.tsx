"use client";

import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";

import { useTheme } from "./theme-provider";

/**
 * Header theme toggle. Both glyphs render and CSS picks one via the .dark
 * ancestor the inline script sets pre-paint — the server-rendered markup is
 * identical in both themes, so there is no icon flash and no hydration
 * mismatch regardless of stored preference.
 */
export function ThemeToggle() {
  const { toggle } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      data-slot="theme-toggle"
      onClick={toggle}
      aria-label="Toggle dark mode"
    >
      <Sun className="hidden dark:block" aria-hidden />
      <Moon className="dark:hidden" aria-hidden />
    </Button>
  );
}
