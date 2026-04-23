import { describe, it, expect } from "vitest";
import { API_URL } from "./env";

describe("API_URL", () => {
  it("is a string", () => {
    expect(typeof API_URL).toBe("string");
  });

  it("defaults to http://localhost:3000 when VITE_API_URL is not set", () => {
    // In the test environment import.meta.env.VITE_API_URL is undefined,
    // so the nullish coalescing fallback should be used.
    expect(API_URL).toBe("http://localhost:3000");
  });

  it("is not an empty string", () => {
    expect(API_URL.length).toBeGreaterThan(0);
  });
});
