import type { Meta, StoryObj } from "@storybook/react";

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
  render: () => <Card className="max-w-sm">
    <CardChildren />
  </Card>,
};

export const WashiTapePin: Story = {
  render: () => (
    <Card
      className="max-w-sm"
      pin={<div className="bg-ink-yellow h-5 w-24 -translate-y-1 rounded-sm opacity-90 shadow-sm" />}
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
