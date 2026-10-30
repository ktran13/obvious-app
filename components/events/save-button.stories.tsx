import type { Meta, StoryObj } from "@storybook/react";

import { SaveButton } from "./save-button";

const meta = {
  component: SaveButton,
} satisfies Meta<typeof SaveButton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Idle: Story = {
  args: { state: "idle" },
};

export const PromptingSignIn: Story = {
  args: { state: "prompting" },
};

export const Saved: Story = {
  args: { state: "saved" },
};
