"use client";

import { useRouter } from "next/navigation";

import { filtersToEventPath } from "@/lib/events/params";

import { FilterBar, type FilterBarOptions } from "./filter-bar";
import type { EventFilters } from "./types";

type FilterBarUrlProps = {
  /** Parsed from the current URL — the rendered state mirrors it on load. */
  filters: EventFilters;
  options: FilterBarOptions;
  className?: string;
};

/**
 * URL-synced FilterBar for the /events directory. Filters live in the query
 * string (shareable, back-button friendly), so every change navigates and
 * the server re-renders results from the URL — one source of truth.
 */
export function FilterBarUrl({ filters, options, className }: FilterBarUrlProps) {
  const router = useRouter();

  return (
    <FilterBar
      filters={filters}
      options={options}
      className={className}
      onChange={(next) => router.push(filtersToEventPath(next), { scroll: false })}
    />
  );
}
