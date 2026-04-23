import { describe, it, expect } from "vitest";
import { cn } from "./cn";

describe("cn", () => {
  it("merges multiple class strings", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("handles a single class", () => {
    expect(cn("foo")).toBe("foo");
  });

  it("returns empty string when called with no arguments", () => {
    expect(cn()).toBe("");
  });

  it("handles conditional classes — truthy condition includes class", () => {
    expect(cn("base", true && "included")).toBe("base included");
  });

  it("handles conditional classes — falsy condition excludes class", () => {
    expect(cn("base", false && "excluded")).toBe("base");
  });

  it("handles object syntax for conditional classes", () => {
    expect(cn({ active: true, disabled: false })).toBe("active");
  });

  it("handles array of classes", () => {
    expect(cn(["foo", "bar"])).toBe("foo bar");
  });

  it("merges conflicting tailwind padding classes (last wins)", () => {
    // tailwind-merge keeps the last conflicting utility
    expect(cn("p-4", "p-2")).toBe("p-2");
  });

  it("merges conflicting tailwind text-color classes (last wins)", () => {
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });

  it("merges conflicting tailwind background classes (last wins)", () => {
    expect(cn("bg-red-500", "bg-green-500")).toBe("bg-green-500");
  });

  it("does not remove non-conflicting tailwind classes", () => {
    const result = cn("p-4", "m-2");
    expect(result).toContain("p-4");
    expect(result).toContain("m-2");
  });

  it("handles undefined and null gracefully", () => {
    expect(cn("foo", undefined, null, "bar")).toBe("foo bar");
  });

  it("handles mixed objects, arrays and strings", () => {
    const result = cn("base", ["array-class"], { obj: true });
    expect(result).toContain("base");
    expect(result).toContain("array-class");
    expect(result).toContain("obj");
  });
});
