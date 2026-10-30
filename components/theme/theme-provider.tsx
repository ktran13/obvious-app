"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type Theme = "light" | "dark";

const STORAGE_KEY = "riso-theme";

const ThemeContext = createContext<{ theme: Theme; toggle: () => void } | null>(null);

/** Apply the theme to the document and persist the explicit choice. */
function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  localStorage.setItem(STORAGE_KEY, theme);
}

/**
 * Client theme boundary for "Photocopy night". The server never knows the
 * theme: layout.tsx runs a tiny inline script pre-paint that reads
 * localStorage (explicit choice) or prefers-color-scheme (default) and sets
 * the .dark class before first paint — no FOUC, no hydration mismatch, no
 * provider dependency (per spec: prefer the inline script over a library).
 *
 * This provider exists so client components (the header toggle) can react:
 * it syncs its state from the class the script already applied, and follows
 * live system-preference changes while the user has made no explicit choice.
 * Pattern follows components/events/save-button-container.tsx: client island,
 * presentational children stay server components.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (event: MediaQueryListEvent) => {
      // A stored choice wins; only systemless users follow the OS toggle.
      if (!localStorage.getItem(STORAGE_KEY)) {
        const next: Theme = event.matches ? "dark" : "light";
        document.documentElement.classList.toggle("dark", next === "dark");
        setTheme(next);
      }
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const toggle = () => {
    const next: Theme = document.documentElement.classList.contains("dark") ? "light" : "dark";
    applyTheme(next);
    setTheme(next);
  };

  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}
