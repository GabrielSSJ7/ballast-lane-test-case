import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Card, CardHeader, CardContent } from "./Card";

describe("Card", () => {
  it("renders children", () => {
    render(<Card>Card body</Card>);
    expect(screen.getByText("Card body")).toBeInTheDocument();
  });

  it("renders as a <div> element", () => {
    render(<Card>Content</Card>);
    expect(screen.getByText("Content").tagName).toBe("DIV");
  });

  it("has base classes including rounded-lg and border", () => {
    render(<Card>Content</Card>);
    const card = screen.getByText("Content");
    expect(card.className).toContain("rounded-lg");
    expect(card.className).toContain("border");
    expect(card.className).toContain("bg-white");
  });

  it("merges custom className", () => {
    render(<Card className="custom-card">Content</Card>);
    expect(screen.getByText("Content").className).toContain("custom-card");
  });
});

describe("CardHeader", () => {
  it("renders children", () => {
    render(<CardHeader>Header text</CardHeader>);
    expect(screen.getByText("Header text")).toBeInTheDocument();
  });

  it("renders as a <div> element", () => {
    render(<CardHeader>Header</CardHeader>);
    expect(screen.getByText("Header").tagName).toBe("DIV");
  });

  it("has base classes including border-b and padding", () => {
    render(<CardHeader>Header</CardHeader>);
    const header = screen.getByText("Header");
    expect(header.className).toContain("border-b");
    expect(header.className).toContain("px-6");
    expect(header.className).toContain("py-4");
  });

  it("merges custom className", () => {
    render(<CardHeader className="custom-header">Header</CardHeader>);
    expect(screen.getByText("Header").className).toContain("custom-header");
  });
});

describe("CardContent", () => {
  it("renders children", () => {
    render(<CardContent>Main content</CardContent>);
    expect(screen.getByText("Main content")).toBeInTheDocument();
  });

  it("renders as a <div> element", () => {
    render(<CardContent>Content</CardContent>);
    expect(screen.getByText("Content").tagName).toBe("DIV");
  });

  it("has base classes including padding", () => {
    render(<CardContent>Content</CardContent>);
    const content = screen.getByText("Content");
    expect(content.className).toContain("px-6");
    expect(content.className).toContain("py-4");
  });

  it("merges custom className", () => {
    render(<CardContent className="custom-content">Content</CardContent>);
    expect(screen.getByText("Content").className).toContain("custom-content");
  });
});

describe("Card composition", () => {
  it("renders Card with CardHeader and CardContent together", () => {
    render(
      <Card>
        <CardHeader>My Title</CardHeader>
        <CardContent>My Body</CardContent>
      </Card>
    );
    expect(screen.getByText("My Title")).toBeInTheDocument();
    expect(screen.getByText("My Body")).toBeInTheDocument();
  });
});
