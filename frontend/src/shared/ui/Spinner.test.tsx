import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Spinner } from "./Spinner";

describe("Spinner", () => {
  it("renders an SVG element with aria-label", () => {
    render(<Spinner />);
    const svg = screen.getByLabelText("Loading");
    expect(svg).toBeInTheDocument();
  });

  it("has aria-label='Loading'", () => {
    render(<Spinner />);
    const svg = screen.getByLabelText("Loading");
    expect(svg).toHaveAttribute("aria-label", "Loading");
  });

  it("has the animate-spin class", () => {
    render(<Spinner />);
    const svg = screen.getByLabelText("Loading");
    expect(svg.getAttribute("class")).toContain("animate-spin");
  });

  it("has text-blue-600 class", () => {
    render(<Spinner />);
    const svg = screen.getByLabelText("Loading");
    expect(svg.getAttribute("class")).toContain("text-blue-600");
  });

  describe("size prop", () => {
    it("applies md size class by default (h-8 w-8)", () => {
      render(<Spinner />);
      const svg = screen.getByLabelText("Loading");
      expect(svg.getAttribute("class")).toContain("h-8");
      expect(svg.getAttribute("class")).toContain("w-8");
    });

    it("applies sm size class when size='sm' (h-4 w-4)", () => {
      render(<Spinner size="sm" />);
      const svg = screen.getByLabelText("Loading");
      expect(svg.getAttribute("class")).toContain("h-4");
      expect(svg.getAttribute("class")).toContain("w-4");
    });

    it("applies lg size class when size='lg' (h-12 w-12)", () => {
      render(<Spinner size="lg" />);
      const svg = screen.getByLabelText("Loading");
      expect(svg.getAttribute("class")).toContain("h-12");
      expect(svg.getAttribute("class")).toContain("w-12");
    });
  });

  describe("className prop", () => {
    it("merges custom className with default classes", () => {
      render(<Spinner className="custom-spinner" />);
      const svg = screen.getByLabelText("Loading");
      expect(svg.getAttribute("class")).toContain("custom-spinner");
    });

    it("still has animate-spin when custom className is provided", () => {
      render(<Spinner className="extra" />);
      const svg = screen.getByLabelText("Loading");
      expect(svg.getAttribute("class")).toContain("animate-spin");
    });
  });

  it("renders internal SVG elements (circle and path)", () => {
    render(<Spinner />);
    const svg = screen.getByLabelText("Loading");
    expect(svg.querySelector("circle")).toBeInTheDocument();
    expect(svg.querySelector("path")).toBeInTheDocument();
  });
});
