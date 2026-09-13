import type { Metadata } from "next";
import { FtcDisclosure } from "@/components/FtcDisclosure";
import { ProductGrid } from "@/components/site/ProductGrid";

export const metadata: Metadata = {
  title: "All Tools & Resources",
  description:
    "Browse every tool we've tested and recommend – filter by category, search by feature, and sort by rating or price.",
};

export default function ToolsPage() {
  return (
    <div className="pb-8">
      <div className="border-b border-border bg-gradient-to-b from-brand-soft/70 to-background">
        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand">Directory</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
            Recommended Tools &amp; Resources
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Every product here has been through our review process. Use the filters to narrow the list down to the
            category, budget, or feature you care about.
          </p>
        </section>
      </div>

      <section className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
        <FtcDisclosure variant="banner" />
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8" aria-labelledby="directory-heading">
        <h2 id="directory-heading" className="sr-only">
          Tool directory
        </h2>
        <ProductGrid showFilters source="directory" />
      </section>
    </div>
  );
}
