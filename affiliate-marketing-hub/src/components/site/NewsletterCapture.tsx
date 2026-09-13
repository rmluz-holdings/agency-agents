"use client";

import { useId, useState } from "react";
import { CheckCircle2, Mail } from "lucide-react";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "amh:subscribers";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function saveSubscriber(email: string): void {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    const list = Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
    if (!list.includes(email)) list.push(email);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* private mode / quota – the success state still shows */
  }
}

interface NewsletterCaptureProps {
  className?: string;
}

/**
 * Email capture band. There is no backend yet – submissions are appended to
 * localStorage under `amh:subscribers` so the flow can be wired to a real
 * ESP later without changing the markup.
 */
export function NewsletterCapture({ className }: NewsletterCaptureProps) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const inputId = useId();
  const errorId = useId();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const value = email.trim().toLowerCase();
    if (!EMAIL_RE.test(value)) {
      setError("Please enter a valid email address.");
      return;
    }
    saveSubscriber(value);
    setError(null);
    setDone(true);
  }

  return (
    <div
      id="newsletter"
      className={cn(
        "relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-brand-soft via-card to-card p-6 sm:p-10",
        className,
      )}
    >
      <div
        className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-brand/15 blur-3xl"
        aria-hidden
      />
      <div className="relative grid gap-8 md:grid-cols-2 md:items-center">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand">
            <Mail className="h-3.5 w-3.5" aria-hidden />
            Weekly deal drop
          </span>
          <h2 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
            Get the best tool deals before they expire
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
            One email a week: new reviews, negotiated discounts, and the high-ticket programs actually worth your time.
            No spam, unsubscribe anytime.
          </p>
        </div>

        {done ? (
          <div
            role="status"
            className="flex items-start gap-3 rounded-2xl border border-emerald-300/60 bg-emerald-50 p-5 text-emerald-950 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-100"
          >
            <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600 dark:text-emerald-300" aria-hidden />
            <div>
              <p className="font-semibold">You&apos;re on the list.</p>
              <p className="mt-1 text-sm opacity-90">
                Watch your inbox for this week&apos;s picks. In the meantime, browse the full directory.
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={onSubmit} noValidate className="space-y-2">
            <label htmlFor={inputId} className="label">
              Email address
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                id={inputId}
                type="email"
                name="email"
                required
                autoComplete="email"
                inputMode="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError(null);
                }}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? errorId : undefined}
                className={cn("input flex-1", error && "border-danger")}
              />
              <button type="submit" className="btn-primary shrink-0 px-5">
                Subscribe
              </button>
            </div>
            {error ? (
              <p id={errorId} className="text-xs font-medium text-danger" role="alert">
                {error}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">Free forever. We never sell your address.</p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
