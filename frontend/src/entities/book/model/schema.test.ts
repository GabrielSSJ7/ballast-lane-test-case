import { describe, it, expect } from "vitest";
import { bookSchema } from "./schema";

describe("bookSchema", () => {
  const valid = {
    title: "Clean Code",
    author: "Robert Martin",
    genre: "Technology",
    isbn: "978-0132350884",
    total_copies: 3,
  };

  it("accepts valid book data", () => {
    expect(bookSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects empty title", () => {
    const result = bookSchema.safeParse({ ...valid, title: "" });
    expect(result.success).toBe(false);
  });

  it("rejects negative total_copies", () => {
    const result = bookSchema.safeParse({ ...valid, total_copies: -1 });
    expect(result.success).toBe(false);
  });

  it("coerces string total_copies to number", () => {
    const result = bookSchema.safeParse({ ...valid, total_copies: "5" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.total_copies).toBe(5);
  });
});
