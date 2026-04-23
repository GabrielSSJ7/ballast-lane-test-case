import { describe, it, expect } from "vitest";
import { registerSchema } from "./schema";

const validData = {
  name: "Alice",
  email: "alice@example.com",
  password: "secret123",
};

describe("registerSchema", () => {
  it("accepts valid data", () => {
    const result = registerSchema.safeParse(validData);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(validData);
    }
  });

  it("rejects empty name", () => {
    const result = registerSchema.safeParse({ ...validData, name: "" });

    expect(result.success).toBe(false);
    if (!result.success) {
      const nameError = result.error.issues.find((i) => i.path.includes("name"));
      expect(nameError).toBeDefined();
      expect(nameError?.message).toBe("Name is required");
    }
  });

  it("rejects invalid email", () => {
    const result = registerSchema.safeParse({ ...validData, email: "not-an-email" });

    expect(result.success).toBe(false);
    if (!result.success) {
      const emailError = result.error.issues.find((i) => i.path.includes("email"));
      expect(emailError).toBeDefined();
      expect(emailError?.message).toBe("Invalid email address");
    }
  });

  it("rejects password shorter than 8 characters", () => {
    const result = registerSchema.safeParse({ ...validData, password: "short" });

    expect(result.success).toBe(false);
    if (!result.success) {
      const passwordError = result.error.issues.find((i) => i.path.includes("password"));
      expect(passwordError).toBeDefined();
      expect(passwordError?.message).toBe("Password must be at least 8 characters");
    }
  });

  it("rejects missing name field", () => {
    const { name: _name, ...withoutName } = validData;
    const result = registerSchema.safeParse(withoutName);

    expect(result.success).toBe(false);
  });

  it("rejects missing email field", () => {
    const { email: _email, ...withoutEmail } = validData;
    const result = registerSchema.safeParse(withoutEmail);

    expect(result.success).toBe(false);
  });

  it("rejects missing password field", () => {
    const { password: _password, ...withoutPassword } = validData;
    const result = registerSchema.safeParse(withoutPassword);

    expect(result.success).toBe(false);
  });
});
