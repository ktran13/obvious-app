import type { Meta, StoryObj } from "@storybook/react";

import { dayKey, formatDayHeading } from "@/lib/date-format";
import { fixtureEvents } from "@/lib/fixtures/events";

import { DayGroup } from "./day-group";
import { EventCard } from "./event-card";
import { SaveButton } from "./save-button";

const meta = {
  component: DayGroup,
} satisfies Meta<typeof DayGroup>;

export default meta;

type Story = StoryObj<typeof meta>;

const saturday = fixtureEvents
  .filter((event) => dayKey(event.startsAt) === "2026-11-07")
  .sort((a, b) => a.startsAt.localeCompare(b.startsAt));

export const Saturday: Story = {
  args: { heading: formatDayHeading("2026-11-07T14:00:00.000Z") },
  render: (args) => (
    <DayGroup {...args}>
      {saturday.map((event) => (
        <EventCard
          key={event.id}
          event={event}
          saveButton={<SaveButton state="idle" />}
        />
      ))}
    </DayGroup>
  ),
};

export const SingleEvent: Story = {
  args: { heading: formatDayHeading("2026-11-07T00:00:00.000Z") },
  render: (args) => (
    <DayGroup {...args}>
      <EventCard event={fixtureEvents[1]!} />
    </DayGroup>
  ),
};

export const Empty: Story = {
  args: { heading: "Sunday, Nov 8" },
  render: (args) => <DayGroup {...args} />,
};
