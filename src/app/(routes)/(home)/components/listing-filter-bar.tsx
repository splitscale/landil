import Link from "next/link";
import { Search, X } from "lucide-react";
import { PRICE_RANGES } from "@/lib/listings-browse";

type Props = {
  query: string;
  propertyTypeFilter: string;
  priceRangeFilter: string;
  propertyTypeOptions: string[];
  /** href to clear all filters, e.g. "/" or "/browse" */
  clearHref: string;
};

export default function ListingFilterBar({
  query,
  propertyTypeFilter,
  priceRangeFilter,
  propertyTypeOptions,
  clearHref,
}: Props) {
  const hasFilters =
    query.length > 0 || propertyTypeFilter !== "all" || priceRangeFilter !== "all";

  return (
    <form>
      <div className="flex h-10 w-full overflow-hidden rounded-lg border border-input bg-background shadow-xs transition-[color,box-shadow] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50 dark:bg-input/30">
        <label className="relative flex min-w-0 flex-1 items-center">
          <Search className="pointer-events-none absolute left-3 size-4 shrink-0 text-muted-foreground" />
          <input
            name="q"
            defaultValue={query}
            placeholder="Search listings…"
            className="h-full w-full border-0 bg-transparent pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground"
          />
        </label>

        <div className="w-px self-stretch bg-input" />

        <select
          name="propertyType"
          defaultValue={propertyTypeFilter}
          className="h-full cursor-pointer border-0 bg-transparent px-3 text-sm text-foreground outline-none"
        >
          <option value="all">All types</option>
          {propertyTypeOptions.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        <div className="w-px self-stretch bg-input" />

        <select
          name="priceRange"
          defaultValue={priceRangeFilter}
          className="h-full cursor-pointer border-0 bg-transparent px-3 text-sm text-foreground outline-none"
        >
          {PRICE_RANGES.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>

        <div className="w-px self-stretch bg-input" />

        <button
          type="submit"
          className="h-full rounded-r-[calc(0.5rem-1px)] bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none"
        >
          Search
        </button>
      </div>

      {hasFilters && (
        <div className="mt-2 flex items-center gap-1.5">
          <Link
            href={clearHref}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <X size={11} />
            Clear filters
          </Link>
        </div>
      )}
    </form>
  );
}
