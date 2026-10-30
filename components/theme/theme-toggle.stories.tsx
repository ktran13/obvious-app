import type { Meta, StoryObj } from "@storybook/react";

import { ThemeProvider } from "./theme-provider";
import { ThemeToggle } from "./theme-toggle";

const meta = {
  component: ThemeToggle,
  decorators: [
    (Story) => (
      <ThemeProvider>
        <Story />
      </ThemeProvider>
    ),
  ],
} satisfies Meta<typeof ThemeToggle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Light: Story = {};

/** Photocopy night: the .dark class scopes the dark token block, so a
 * wrapper div reproduces the dark surface inside the story canvas. */
export const Dark: Story = {
  decorators: [
    (Story) => (
      <div className="dark bg-background text-foreground rounded-lg p-4">
        <Story />
      </div>
    ),
  ],
};
