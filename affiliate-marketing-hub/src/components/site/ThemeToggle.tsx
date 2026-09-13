"use client";

import { useCallback, useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "amh:theme";
type Theme = "light" | "dark";

function readStored(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function currentTheme(): Theme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function setClass(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

/**
 * The <html> class is the single source of truth (the boot script in the
 * root layout sets it before hydration). We observe it with a
 * MutationObserver so React state never has to be seeded from an effect.
 */
function subscribe(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

  // Follow OS changes while the user hasn't made an explicit choice.
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const onMedia = (e: MediaQueryListEvent) => {
    if (readStored()) return;
    setClass(e.matches ? "dark" : "light");
  };
  media.addEventListener("change", onMedia);

  return () => {
    observer.disconnect();
    media.removeEventListener("change", onMedia);
  };
}

const getSnapshot = (): Theme => currentTheme();
// Server / first client render: unknown until hydrated, so both agree.
const getServerSnapshot = (): Theme | null => null;

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const theme = useSyncExternalStore<Theme | null>(subscribe, getSnapshot, getServerSnapshot);

  const toggle = useCallback(() => {
    const next: Theme = currentTheme() === "dark" ? "light" : "dark";
    setClass(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* private mode – theme still applies for this session */
    }
  }, []);

  const isDark = theme === "dark";
  const label = theme === null ? "Toggle theme" : isDark ? "Switch to light mode" : "Switch to dark mode";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      aria-pressed={theme === null ? undefined : isDark}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-foreground transition-colors hover:bg-muted",
        className,
      )}
    >
      {/* Both icons are rendered and swapped via CSS so nothing flashes before hydration. */}
      <Sun className="h-4 w-4 dark:hidden" aria-hidden />
      <Moon className="hidden h-4 w-4 dark:block" aria-hidden />
    </button>
  );
}
