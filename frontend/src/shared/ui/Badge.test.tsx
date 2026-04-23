import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Badge } from "./Badge";

describe("Badge", () => {
  it("renders children text", () => {
    render(<Badge>Active</Badge>);
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("renders as a <span> element", () => {
    render(<Badge>Label</Badge>);
    expect(screen.getByText("Label").tagName).toBe("SPAN");
  });

  it("has base classes on all variants", () => {
    render(<Badge>Base</Badge>);
    const badge = screen.getByText("Base");
    expect(badge.className).toContain("inline-flex");
    expect(badge.className).toContain("rounded-full");
    expect(badge.className).toContain("text-xs");
    expect(badge.className).toContain("font-medium");
  });

  describe("variants", () => {
    it("applies default variant classes by default", () => {
      render(<Badge>Default</Badge>);
      const badge = screen.getByText("Default");
      expect(badge.className).toContain("bg-gray-100");
      expect(badge.className).toContain("text-gray-800");
    });

    it("applies success variant classes", () => {
      render(<Badge variant="success">Success</Badge>);
      const badge = screen.getByText("Success");
      expect(badge.className).toContain("bg-green-100");
      expect(badge.className).toContain("text-green-800");
    });

    it("applies warning variant classes", () => {
      render(<Badge variant="warning">Warning</Badge>);
      const badge = screen.getByText("Warning");
      expect(badge.className).toContain("bg-yellow-100");
      expect(badge.className).toContain("text-yellow-800");
    });

    it("applies danger variant classes", () => {
      render(<Badge variant="danger">Danger</Badge>);
      const badge = screen.getByText("Danger");
      expect(badge.className).toContain("bg-red-100");
      expect(badge.className).toContain("text-red-800");
    });

    it("applies info variant classes", () => {
      render(<Badge variant="info">Info</Badge>);
      const badge = screen.getByText("Info");
      expect(badge.className).toContain("bg-blue-100");
      expect(badge.className).toContain("text-blue-800");
    });
  });

  describe("className forwarding", () => {
    it("merges custom className with default classes", () => {
      render(<Badge className="extra-class">Custom</Badge>);
      expect(screen.getByText("Custom").className).toContain("extra-class");
    });
  });
});
