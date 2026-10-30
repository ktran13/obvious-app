import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";

// Vitest without `globals: true` does not auto-cleanup between tests.
afterEach(cleanup);
