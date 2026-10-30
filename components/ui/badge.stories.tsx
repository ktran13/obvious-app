import type { Meta, StoryObj } from "@storybook/react";

import { Badge } from "./badge";

const meta = {
  component: Badge,
} satisfies Meta<typeof Badge>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Stamp: Story = {
  args: { children: "FREE" },
};

export const SelectedStamp: Story = {
  args: { variant: "selected", children: "Music" },
};

export const Starburst: Story = {
  args: { variant: "starburst", children: "TONIGHT" },
};
