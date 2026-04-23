import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { Input } from "./Input";

describe("Input", () => {
  it("renders an input element", () => {
    render(<Input />);
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("renders without a label when label prop is omitted", () => {
    render(<Input placeholder="Enter text" />);
    // No label element should exist
    expect(screen.queryByRole("label")).not.toBeInTheDocument();
    expect(document.querySelector("label")).not.toBeInTheDocument();
  });

  describe("label", () => {
    it("renders label text when label prop is provided", () => {
      render(<Input label="Email" />);
      expect(screen.getByText("Email")).toBeInTheDocument();
    });

    it("renders a <label> element", () => {
      render(<Input label="Username" />);
      expect(document.querySelector("label")).toBeInTheDocument();
    });

    it("associates label htmlFor with input id (derived from label text)", () => {
      render(<Input label="Email Address" />);
      const label = document.querySelector("label") as HTMLLabelElement;
      const input = screen.getByRole("textbox") as HTMLInputElement;
      expect(label.htmlFor).toBe("email-address");
      expect(input.id).toBe("email-address");
    });

    it("uses explicit id prop over derived id", () => {
      render(<Input label="Email" id="custom-id" />);
      const label = document.querySelector("label") as HTMLLabelElement;
      const input = screen.getByRole("textbox") as HTMLInputElement;
      expect(label.htmlFor).toBe("custom-id");
      expect(input.id).toBe("custom-id");
    });
  });

  describe("error", () => {
    it("renders error message when error prop is provided", () => {
      render(<Input error="This field is required" />);
      expect(screen.getByText("This field is required")).toBeInTheDocument();
    });

    it("does not render error message when error prop is omitted", () => {
      render(<Input />);
      expect(document.querySelector("p")).not.toBeInTheDocument();
    });

    it("applies error border class when error prop is provided", () => {
      render(<Input error="Invalid value" />);
      const input = screen.getByRole("textbox");
      expect(input.className).toContain("border-red-500");
    });

    it("does not apply error border class when there is no error", () => {
      render(<Input />);
      const input = screen.getByRole("textbox");
      expect(input.className).not.toContain("border-red-500");
    });
  });

  describe("ref forwarding", () => {
    it("forwards ref to the underlying input element", () => {
      const ref = createRef<HTMLInputElement>();
      render(<Input ref={ref} />);
      expect(ref.current).not.toBeNull();
      expect(ref.current?.tagName).toBe("INPUT");
    });

    it("allows focusing via ref", () => {
      const ref = createRef<HTMLInputElement>();
      render(<Input ref={ref} />);
      ref.current?.focus();
      expect(document.activeElement).toBe(ref.current);
    });
  });

  describe("passthrough props", () => {
    it("passes placeholder to the input", () => {
      render(<Input placeholder="Search..." />);
      expect(screen.getByPlaceholderText("Search...")).toBeInTheDocument();
    });

    it("passes type prop to the input", () => {
      render(<Input type="password" />);
      const input = document.querySelector("input") as HTMLInputElement;
      expect(input.type).toBe("password");
    });
  });
});
