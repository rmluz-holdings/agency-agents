"use client";

import { useMemo, useState } from "react";
import { Link2, Loader2, Plus, Search, Upload } from "lucide-react";
import { api } from "@/lib/api";
import { NETWORK_LABEL } from "@/lib/affiliate";
import { useSettings } from "@/hooks/useSettings";
import { useStoreQuery } from "@/hooks/useStore";
import type { AffiliateLink, AffiliateNetwork, LinkStat, Product } from "@/lib/types";
import { formatNumber, isValidHttpUrl } from "@/lib/utils";
import { LinkForm } from "./LinkForm";
import { LinkTable } from "./LinkTable";

interface ManagerData {
  links: AffiliateLink[];
  stats: LinkStat[];
  products: Product[];
}

type NetworkFilter = AffiliateNetwork | "all";

const NETWORKS = Object.keys(NETWORK_LABEL) as AffiliateNetwork[];

/** Parse a "Name | https://url" bulk-import textarea. */
function parseBulk(raw: string): { name: string; url: string }[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, url] = line.split("|").map((p) => p.trim());
      return { name: name ?? "", url: url ?? "" };
    })
    .filter((row) => row.name && isValidHttpUrl(row.url));
}

export function LinkManager() {
  const { settings } = useSettings();
  const [query, setQuery] = useState("");
  const [networkFilter, setNetworkFilter] = useState<NetworkFilter>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AffiliateLink | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const { data, loading } = useStoreQuery<ManagerData>(
    async () => {
      const [links, stats, products] = await Promise.all([
        api.links.list(),
        api.analytics.byLink(30),
        api.products.list(),
      ]);
      return { links, stats, products };
    },
    [api.links, api.analytics],
  );

  const links = useMemo(() => data?.links ?? [], [data]);
  const clicks = useMemo(() => {
    const map: Record<string, number> = {};
    for (const stat of data?.stats ?? []) map[stat.linkId] = stat.clicks;
    return map;
  }, [data]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return links.filter((link) => {
      if (networkFilter !== "all" && link.network !== networkFilter) return false;
      if (!q) return true;
      return (
        link.name.toLowerCase().includes(q) ||
        link.slug.toLowerCase().includes(q) ||
        link.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [links, query, networkFilter]);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (link: AffiliateLink) => {
    setEditing(link);
    setFormOpen(true);
  };

  const remove = async (link: AffiliateLink) => {
    if (!window.confirm(`Delete “${link.name}”? Existing /go/${link.slug} traffic will 404.`)) return;
    await api.links.remove(link.id);
    setNotice(`Deleted “${link.name}”.`);
  };

  const toggleActive = async (link: AffiliateLink) => {
    await api.links.updateLink(link.id, { active: !link.active });
    setNotice(`“${link.name}” is now ${link.active ? "inactive" : "active"}.`);
  };

  const runBulkImport = async () => {
    const rows = parseBulk(bulkText);
    if (rows.length === 0) {
      setNotice("Nothing to import — use one `Name | https://url` per line.");
      return;
    }
    setBulkBusy(true);
    let created = 0;
    const failures: string[] = [];
    try {
      for (const row of rows) {
        try {
          await api.links.createLink({
            name: row.name,
            destinationUrl: row.url,
            network: settings.defaultNetwork,
          });
          created += 1;
        } catch (err) {
          failures.push(`${row.name}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
      setBulkText("");
      setNotice(
        failures.length === 0
          ? `Imported ${created} link${created === 1 ? "" : "s"}.`
          : `Imported ${created}, skipped ${failures.length}. ${failures[0]}`,
      );
    } finally {
      setBulkBusy(false);
    }
  };

  const activeCount = links.filter((l) => l.active).length;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="card flex flex-wrap items-center gap-3 p-3 sm:p-4">
        <div className="relative min-w-56 flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            type="search"
            className="input pl-9"
            placeholder="Search by name, slug or tag"
            aria-label="Search links"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="link-network-filter" className="sr-only">
            Filter by network
          </label>
          <select
            id="link-network-filter"
            className="input w-auto"
            value={networkFilter}
            onChange={(e) => setNetworkFilter(e.target.value as NetworkFilter)}
          >
            <option value="all">All networks</option>
            {NETWORKS.map((n) => (
              <option key={n} value={n}>
                {NETWORK_LABEL[n]}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={() => setBulkOpen((v) => !v)}
          aria-expanded={bulkOpen}
          aria-controls="bulk-import-panel"
          className="btn-secondary text-sm"
        >
          <Upload className="h-4 w-4" aria-hidden />
          Bulk import
        </button>

        <button type="button" onClick={openCreate} className="btn-primary text-sm">
          <Plus className="h-4 w-4" aria-hidden />
          New link
        </button>

        <p role="status" aria-live="polite" className="w-full text-xs text-muted-foreground empty:hidden">
          {notice}
        </p>
      </div>

      {/* Bulk import */}
      <div id="bulk-import-panel" hidden={!bulkOpen} className="card p-4 sm:p-5">
        <label htmlFor="bulk-import" className="label">
          Bulk import
        </label>
        <textarea
          id="bulk-import"
          className="input min-h-28 font-mono text-xs"
          value={bulkText}
          onChange={(e) => setBulkText(e.target.value)}
          placeholder={"Semrush Pro | https://www.semrush.com/pricing/\nKinsta | https://kinsta.com/plans/"}
          aria-describedby="bulk-import-hint"
        />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <p id="bulk-import-hint" className="text-xs text-muted-foreground">
            One <code className="font-mono">Name | URL</code> per line. Slugs are generated
            automatically and the network defaults to {NETWORK_LABEL[settings.defaultNetwork]}.
          </p>
          <button
            type="button"
            onClick={() => void runBulkImport()}
            disabled={bulkBusy}
            className="btn-primary text-sm"
          >
            {bulkBusy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            Import {parseBulk(bulkText).length || ""} links
          </button>
        </div>
      </div>

      {/* Table */}
      <section className="card overflow-hidden" aria-labelledby="links-heading">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border px-4 py-3 sm:px-5">
          <h2 id="links-heading" className="text-sm font-bold tracking-tight">
            Cloaked links
          </h2>
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Link2 className="h-3.5 w-3.5" aria-hidden />
            {formatNumber(filtered.length)} shown · {formatNumber(activeCount)} active
          </span>
        </div>

        {loading ? (
          <div className="skeleton m-4 h-64" />
        ) : (
          <LinkTable
            links={filtered}
            clicks={clicks}
            onEdit={openEdit}
            onDelete={(link) => void remove(link)}
            onToggleActive={(link) => void toggleActive(link)}
          />
        )}
      </section>

      {formOpen ? (
        <LinkForm
          key={editing?.id ?? "new"}
          link={editing}
          products={data?.products ?? []}
          trackingId={settings.trackingId}
          defaultNetwork={settings.defaultNetwork}
          onClose={() => setFormOpen(false)}
          onSaved={(saved) => {
            setFormOpen(false);
            setNotice(`Saved “${saved.name}” → /go/${saved.slug}.`);
          }}
        />
      ) : null}
    </div>
  );
}
