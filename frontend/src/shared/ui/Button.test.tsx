import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "./Button";

describe("Button", () => {
  it("renders children text", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole("button", { name: "Click me" })).toBeInTheDocument();
  });

  it("renders as a <button> element", () => {
    render(<Button>Submit</Button>);
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  describe("variants", () => {
    it("applies primary variant classes by default", () => {
      render(<Button>Primary</Button>);
      const btn = screen.getByRole("button");
      expect(btn.className).toContain("bg-blue-600");
      expect(btn.className).toContain("text-white");
    });

    it("applies danger variant classes", () => {
      render(<Button variant="danger">Delete</Button>);
      const btn = screen.getByRole("button");
      expect(btn.className).toContain("bg-red-600");
      expect(btn.className).toContain("text-white");
    });

    it("applies ghost variant classes", () => {
      render(<Button variant="ghost">Ghost</Button>);
      const btn = screen.getByRole("button");
      expect(btn.className).toContain("text-gray-600");
    });

    it("applies outline variant classes", () => {
      render(<Button variant="outline">Outline</Button>);
      const btn = screen.getByRole("button");
      expect(btn.className).toContain("border");
      expect(btn.className).toContain("text-gray-700");
    });
  });

  describe("isLoading", () => {
    it("shows the spinner SVG when isLoading is true", () => {
      render(<Button isLoading>Save</Button>);
      // The spinner svg has aria-hidden so we query by the container button
      const btn = screen.getByRole("button");
      const svg = btn.querySelector("svg");
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveClass("animate-spin");
    });

    it("does not show the spinner SVG when isLoading is false", () => {
      render(<Button isLoading={false}>Save</Button>);
      const btn = screen.getByRole("button");
      const svg = btn.querySelector("svg");
      expect(svg).not.toBeInTheDocument();
    });

    it("disables the button when isLoading is true", () => {
      render(<Button isLoading>Saving...</Button>);
      expect(screen.getByRole("button")).toBeDisabled();
    });
  });

  describe("disabled state", () => {
    it("disables the button when disabled prop is true", () => {
      render(<Button disabled>Can't click</Button>);
      expect(screen.getByRole("button")).toBeDisabled();
    });

    it("is not disabled by default", () => {
      render(<Button>Active</Button>);
      expect(screen.getByRole("button")).not.toBeDisabled();
    });
  });

  describe("onClick", () => {
    it("calls onClick handler when clicked", async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();

      render(<Button onClick={handleClick}>Click me</Button>);
      await user.click(screen.getByRole("button"));

      expect(handleClick).toHaveBeenCalledOnce();
    });

    it("does not call onClick when button is disabled", async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();

      render(
        <Button disabled onClick={handleClick}>
          Disabled
        </Button>
      );
      await user.click(screen.getByRole("button"));

      expect(handleClick).not.toHaveBeenCalled();
    });

    it("does not call onClick when isLoading is true", async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();

      render(
        <Button isLoading onClick={handleClick}>
          Loading
        </Button>
      );
      await user.click(screen.getByRole("button"));

      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe("className forwarding", () => {
    it("merges custom className with default classes", () => {
      render(<Button className="custom-class">Styled</Button>);
      expect(screen.getByRole("button").className).toContain("custom-class");
    });
  });
});
