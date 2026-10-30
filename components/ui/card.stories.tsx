import type { Meta, StoryObj } from "@storybook/react";

import { Badge } from "./badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./card";

const meta = {
  component: Card,
} satisfies Meta<typeof Card>;
export default meta;

type Story = StoryObj<typeof meta>;

function CardChildren() {
  return (
    <>
      <CardHeader>
        <CardTitle>Rooftop film night</CardTitle>
        <CardDescription>Lower East Side · Tonight 8pm</CardDescription>
      </CardHeader>
      <CardContent>
        Open-air screening with riso-printed programs and hand-stamped tickets.
      </CardContent>
    </>
  );
}

export const Default: Story = {
  render: () => (
    <Card className="max-w-sm">
      <CardChildren />
    </Card>
  ),
};

export const WashiTapePin: Story = {
  render: () => (
    <Card
      className="max-w-sm"
      pin={
        <div className="bg-ink-yellow h-5 w-24 -translate-y-1 rounded-sm opacity-90 shadow-sm" />
      }
    >
      <CardChildren />
    </Card>
  ),
};

export const TornEdgeFeature: Story = {
  render: () => (
    <Card variant="feature" className="max-w-sm">
      <CardChildren />
    </Card>
  ),
};

// Homepage persona-entry treatment (PR4 marketing texture): torn-edge
// feature card with a single starburst sticker showing the event count —
// max one sticker per card.
export const PersonaHighlight: Story = {
  render: () => (
    <Card variant="feature" className="max-w-xs p-4">
      <Badge
        variant="starburst"
        className="font-hand absolute top-2 right-2 rotate-12 text-[10px] leading-none"
      >
        12 on
      </Badge>
      <span className="block pr-12 text-sm font-semibold">Arts &amp; culture</span>
      <span className="text-muted-foreground mt-0.5 block text-xs">12 upcoming events</span>
    </Card>
  ),
};
