import { Suspense } from "react";
import type { Metadata } from "next";
import { ReviewsIndex } from "./ReviewsIndex";

export const metadata: Metadata = {
  title: "Reviews & buying guides",
  description:
    "Hands-on software reviews, ranked roundups and head-to-head comparisons. Real pricing, honest pros and cons, and clearly disclosed affiliate links.",
  alternates: { canonical: "/reviews" },
  openGraph: {
    title: "Reviews & buying guides",
    description:
      "Hands-on software reviews, ranked roundups and head-to-head comparisons — tested with paid accounts.",
    type: "website",
  },
};

function ReviewsFallback() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="skeleton h-10 w-2/3 max-w-lg" />
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="skeleton h-56 w-full" />
        ))}
      </div>
    </div>
  );
}

export default function ReviewsPage() {
  return (
    <Suspense fallback={<ReviewsFallback />}>
      <ReviewsIndex />
    </Suspense>
  );
}
