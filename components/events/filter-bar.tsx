"use client";

import { cn } from "cn";

import type { EventFilters } from "./types";

export type FilterBarOptions = {
  interests: string[];
  personas: string[];
  when: string[];
  days: string[];
  neighborhoods: string[];
};

type FilterBarProps = {
  /** Currently selected filters — the rendered state always mirrors this. */
  filters: EventFilters;
  options: FilterBarOptions;
  onChange?: (next: EventFilters) => void;
  className?: string;
};

const selectClass =
  "h-8 rounded-lg border border-border bg-background px-2 text-sm";

/**
 * Controlled filter controls. All selected values render from `filters`;
 * changes are reported upward via `onChange` — no local or global state.
 */
export function FilterBar({
  filters,
  options,
  onChange,
  className,
}: FilterBarProps) {
  const update = (patch: Partial<EventFilters>) =>
    onChange?.({ ...filters, ...patch });

  return (
    <form
      data-slot="filter-bar"
      role="group"
      aria-label="Event filters"
      onSubmit={(e) => e.preventDefault()}
      className={cn("flex flex-wrap items-end gap-3", className)}
    >
      <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
        Interest
        <select
          className={selectClass}
          value={filters.interests[0] ?? ""}
          onChange={(e) =>
            update({ interests: e.target.value ? [e.target.value] : [] })
          }
        >
          <option value="">All interests</option>
          {options.interests.map((interest) => (
            <option key={interest} value={interest}>
              {interest}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
        Persona
        <select
          className={selectClass}
          value={filters.persona ?? ""}
          onChange={(e) => update({ persona: e.target.value || null })}
        >
          <option value="">Any persona</option>
          {options.personas.map((persona) => (
            <option key={persona} value={persona}>
              {persona}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
        When
        <select
          className={selectClass}
          value={filters.when ?? ""}
          onChange={(e) => update({ when: e.target.value || null })}
        >
          <option value="">Any time</option>
          {options.when.map((preset) => (
            <option key={preset} value={preset}>
              {preset}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
        Day
        <select
          className={selectClass}
          value={filters.day ?? ""}
          onChange={(e) => update({ day: e.target.value || null })}
        >
          <option value="">Any day</option>
          {options.days.map((day) => (
            <option key={day} value={day}>
              {day}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
        Neighborhood
        <select
          className={selectClass}
          value={filters.neighborhoods[0] ?? ""}
          onChange={(e) =>
            update({
              neighborhoods: e.target.value ? [e.target.value] : [],
            })
          }
        >
          <option value="">All neighborhoods</option>
          {options.neighborhoods.map((neighborhood) => (
            <option key={neighborhood} value={neighborhood}>
              {neighborhood}
            </option>
          ))}
        </select>
      </label>

      <label className="flex h-8 items-center gap-1.5 text-sm font-medium">
        <input
          type="checkbox"
          checked={filters.freeOnly}
          onChange={(e) => update({ freeOnly: e.target.checked })}
          className="size-4 rounded border-border accent-primary"
        />
        Free only
      </label>
    </form>
  );
}
