import type { Meta, StoryObj } from "@storybook/react";

import { fixtureEvents } from "@/lib/fixtures/events";

import { SourceBadge } from "./source-badge";

const meta = {
  component: SourceBadge,
} satisfies Meta<typeof SourceBadge>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Luma: Story = {
  args: { source: { slug: "luma", label: "Luma" } },
};

export const Meetup: Story = {
  args: { source: { slug: "meetup", label: "Meetup" } },
};

export const Curated: Story = {
  args: {
    source: fixtureEvents.find((event) => event.source.slug === "curated")!.source,
  },
};
