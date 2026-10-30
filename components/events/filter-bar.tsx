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
 *
 * Labels associate via htmlFor/id (not wrapping) so each control's
 * accessible name is exactly the label text, not "Day Any day".
 */
export function FilterBar({
  filters,
  options,
  onChange,
  className,
}: FilterBarProps) {
  const update = (patch: Partial<EventFilters>) =>
    onChange?.({ ...filters, ...patch });

  const selectControl = (
    id: string,
    label: string,
    value: string,
    onValue: (next: string) => void,
    choices: string[],
    emptyChoice: string,
  ) => (
    <div className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        className={selectClass}
        value={value}
        onChange={(e) => onValue(e.target.value)}
      >
        <option value="">{emptyChoice}</option>
        {choices.map((choice) => (
          <option key={choice} value={choice}>
            {choice}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <form
      data-slot="filter-bar"
      role="group"
      aria-label="Event filters"
      onSubmit={(e) => e.preventDefault()}
      className={cn("flex flex-wrap items-end gap-3", className)}
    >
      {selectControl(
        "filter-interest",
        "Interest",
        filters.interests[0] ?? "",
        (v) => update({ interests: v ? [v] : [] }),
        options.interests,
        "All interests",
      )}

      {selectControl(
        "filter-persona",
        "Persona",
        filters.persona ?? "",
        (v) => update({ persona: v || null }),
        options.personas,
        "Any persona",
      )}

      {selectControl(
        "filter-when",
        "When",
        filters.when ?? "",
        (v) => update({ when: v || null }),
        options.when,
        "Any time",
      )}

      {selectControl(
        "filter-day",
        "Day",
        filters.day ?? "",
        (v) => update({ day: v || null }),
        options.days,
        "Any day",
      )}

      {selectControl(
        "filter-neighborhood",
        "Neighborhood",
        filters.neighborhoods[0] ?? "",
        (v) => update({ neighborhoods: v ? [v] : [] }),
        options.neighborhoods,
        "All neighborhoods",
      )}

      <div className="flex h-8 items-center gap-1.5 text-sm font-medium">
        <input
          id="filter-free"
          type="checkbox"
          checked={filters.freeOnly}
          onChange={(e) => update({ freeOnly: e.target.checked })}
          className="size-4 rounded border-border accent-primary"
        />
        <label htmlFor="filter-free">Free only</label>
      </div>
    </form>
  );
}
