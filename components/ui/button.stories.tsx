import type { Meta, StoryObj } from "@storybook/react";

import { Button } from "./button";

const meta = {
  component: Button,
} satisfies Meta<typeof Button>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: { children: "Save event" },
};

export const Outline: Story = {
  args: { variant: "outline", children: "Filters" },
};

export const Secondary: Story = {
  args: { variant: "secondary", children: "Clear" },
};

/** Photocopy night: magenta fill keeps ink-black text (contrast lock — the
 * same AA-passing pairing as light mode). */
export const Dark: Story = {
  args: { children: "Save event" },
  decorators: [
    (Story) => (
      <div className="dark bg-background text-foreground rounded-lg p-4">
        <Story />
      </div>
    ),
  ],
};
