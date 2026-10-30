import type { Meta, StoryObj } from "@storybook/react";

import { fixtureEvents } from "@/lib/fixtures/events";

import { EventCard } from "./event-card";
import { SaveButton } from "./save-button";

const meta = {
  component: EventCard,
} satisfies Meta<typeof EventCard>;

export default meta;

type Story = StoryObj<typeof meta>;

const paid = fixtureEvents.find((event) => !event.isFree)!;
const free = fixtureEvents.find((event) => event.isFree)!;

export const PaidEvent: Story = {
  args: { event: paid },
};

export const FreeEvent: Story = {
  args: { event: free },
};

export const WithSaveSlot: Story = {
  args: {
    event: free,
    saveButton: <SaveButton state="idle" />,
  },
};

export const SavedWithSlot: Story = {
  args: {
    event: paid,
    saveButton: <SaveButton state="saved" />,
  },
};

export const ChicagoTime: Story = {
  args: { event: paid, timeZone: "America/Chicago" },
};
