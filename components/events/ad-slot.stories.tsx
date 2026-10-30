import type { Meta, StoryObj } from "@storybook/react";

import { AdSlot } from "./ad-slot";

const meta = {
  component: AdSlot,
} satisfies Meta<typeof AdSlot>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const InlineLabel: Story = {
  args: { label: "Sponsored slot" },
};
