import { NextResponse } from "next/server";

import { getDb } from "@/lib/db";
import { checkHealth } from "@/lib/health";

type UnhealthyBody = { status: "error"; db: false };

export async function GET(): Promise<NextResponse<unknown>> {
  try {
    const result = await checkHealth(getDb());
    return NextResponse.json(result);
  } catch (error) {
    console.error("Health check failed:", error);
    return NextResponse.json({ status: "error", db: false } satisfies UnhealthyBody, {
      status: 503,
    });
  }
}
