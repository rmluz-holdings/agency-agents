import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Compass, Home } from "lucide-react";

export const metadata: Metadata = {
  title: "Page not found",
};

export default function NotFound() {
  return (
    <section className="mx-auto flex max-w-7xl flex-col items-center px-4 py-24 text-center sm:px-6 lg:px-8">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-soft text-brand">
        <Compass className="h-8 w-8" aria-hidden />
      </span>
      <p className="mt-6 text-xs font-semibold uppercase tracking-wider text-brand">404</p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
        That page wandered off
      </h1>
      <p className="mt-4 max-w-md text-base leading-relaxed text-muted-foreground">
        The link may be outdated, or the page has moved. Head back to the hub or browse the full tool directory.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link href="/" className="btn-primary px-6 py-3">
          <Home className="h-4 w-4" aria-hidden />
          Back to home
        </Link>
        <Link href="/tools" className="btn-secondary px-6 py-3">
          Browse tools
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </section>
  );
}
