import { describe, it, expect, beforeEach } from "vitest";
import { useAuthStore } from "./store";

describe("useAuthStore", () => {
  beforeEach(() => {
    useAuthStore.getState().clearAuth();
  });

  it("starts with null token and user", () => {
    const { token, user } = useAuthStore.getState();
    expect(token).toBeNull();
    expect(user).toBeNull();
  });

  it("sets auth correctly", () => {
    const mockUser = { id: 1, name: "Alice", email: "alice@example.com", role: "member" as const };
    useAuthStore.getState().setAuth("test-token-123", mockUser);
    const { token, user } = useAuthStore.getState();
    expect(token).toBe("test-token-123");
    expect(user).toEqual(mockUser);
  });

  it("clears auth", () => {
    useAuthStore.getState().setAuth("token", { id: 1, name: "Alice", email: "a@a.com", role: "member" });
    useAuthStore.getState().clearAuth();
    expect(useAuthStore.getState().token).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
  });

  it("setUser updates only the user without changing token", () => {
    useAuthStore.getState().setAuth("test-token", { id: 1, name: "Alice", email: "a@a.com", role: "member" });
    const newUser = { id: 1, name: "Alice Updated", email: "a@a.com", role: "member" as const };
    useAuthStore.getState().setUser(newUser);
    const { token, user } = useAuthStore.getState();
    expect(token).toBe("test-token");
    expect(user?.name).toBe("Alice Updated");
  });
});
