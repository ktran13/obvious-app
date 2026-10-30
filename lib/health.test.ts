import { describe, expect, it, vi } from "vitest";

import { checkHealth, type DbExecutor } from "./health";

function stubExecutor(impl: () => Promise<unknown>): DbExecutor {
  return { execute: vi.fn(impl) };
}

describe("checkHealth", () => {
  it("returns the ok payload when the DB answers the probe query", async () => {
    const executor = stubExecutor(() => Promise.resolve({ rows: [{ 1: 1 }] }));

    await expect(checkHealth(executor)).resolves.toEqual({
      status: "ok",
      db: true,
    });
  });

  it("propagates the error when the DB is unreachable (route maps it to 503)", async () => {
    const executor = stubExecutor(() => Promise.reject(new Error("connection refused")));

    await expect(checkHealth(executor)).rejects.toThrow("connection refused");
  });
});
