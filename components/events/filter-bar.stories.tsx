import type { Meta, StoryObj } from "@storybook/react";

import { fixtureFilterOptions, fixtureFilters } from "@/lib/fixtures/events";

import { FilterBar } from "./filter-bar";

const meta = {
  component: FilterBar,
} satisfies Meta<typeof FilterBar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Unselected: Story = {
  args: { filters: fixtureFilters, options: fixtureFilterOptions },
};

export const FullySelected: Story = {
  args: {
    filters: {
      interests: ["Tech"],
      persona: "Newcomer",
      when: "weekend",
      day: "Saturday",
      freeOnly: true,
      neighborhoods: ["Bushwick"],
    },
    options: fixtureFilterOptions,
  },
};
