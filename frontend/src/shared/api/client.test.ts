import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { apiClient, ApiError } from "./client";
import { useAuthStore } from "../../entities/user/model/store";

// Helper to build a mock fetch response
function makeMockResponse(overrides: {
  ok?: boolean;
  status?: number;
  json?: () => Promise<unknown>;
}) {
  return {
    ok: overrides.ok ?? true,
    status: overrides.status ?? 200,
    json: overrides.json ?? vi.fn().mockResolvedValue({}),
  };
}

describe("ApiError", () => {
  it("stores status and data", () => {
    const error = new ApiError(404, { message: "Not found" });
    expect(error.status).toBe(404);
    expect(error.data).toEqual({ message: "Not found" });
  });

  it("is an instance of Error", () => {
    const error = new ApiError(500, {});
    expect(error).toBeInstanceOf(Error);
  });

  it("has a descriptive message", () => {
    const error = new ApiError(401, {});
    expect(error.message).toBe("API Error 401");
  });
});

describe("apiClient", () => {
  beforeEach(() => {
    // Reset auth store to unauthenticated state before each test
    useAuthStore.setState({ token: null, user: null });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("GET requests", () => {
    it("makes a GET request to the correct URL", async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        makeMockResponse({ json: vi.fn().mockResolvedValue({ data: "test" }) })
      );
      vi.stubGlobal("fetch", mockFetch);

      await apiClient.get("/books");

      expect(mockFetch).toHaveBeenCalledOnce();
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe("http://localhost:3000/books");
      expect(options.method).toBe("GET");
    });

    it("returns parsed JSON on success", async () => {
      const payload = { id: 1, title: "Clean Code" };
      const mockFetch = vi.fn().mockResolvedValue(
        makeMockResponse({ json: vi.fn().mockResolvedValue(payload) })
      );
      vi.stubGlobal("fetch", mockFetch);

      const result = await apiClient.get("/books/1");
      expect(result).toEqual(payload);
    });

    it("appends query params to the URL", async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        makeMockResponse({ json: vi.fn().mockResolvedValue([]) })
      );
      vi.stubGlobal("fetch", mockFetch);

      await apiClient.get("/books", { params: { page: 1, search: "rust" } });

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain("page=1");
      expect(url).toContain("search=rust");
    });

    it("omits undefined query params", async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        makeMockResponse({ json: vi.fn().mockResolvedValue([]) })
      );
      vi.stubGlobal("fetch", mockFetch);

      await apiClient.get("/books", { params: { page: 1, search: undefined } });

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain("page=1");
      expect(url).not.toContain("search");
    });
  });

  describe("POST requests", () => {
    it("makes a POST request with a JSON body", async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        makeMockResponse({ status: 201, json: vi.fn().mockResolvedValue({ id: 2 }) })
      );
      vi.stubGlobal("fetch", mockFetch);

      await apiClient.post("/books", { title: "New Book" });

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe("http://localhost:3000/books");
      expect(options.method).toBe("POST");
      expect(options.body).toBe(JSON.stringify({ title: "New Book" }));
    });

    it("makes a POST request without a body when body is undefined", async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        makeMockResponse({ status: 201, json: vi.fn().mockResolvedValue({ id: 3 }) })
      );
      vi.stubGlobal("fetch", mockFetch);

      await apiClient.post("/books");

      const [, options] = mockFetch.mock.calls[0];
      expect(options.body).toBeUndefined();
    });
  });

  describe("PATCH requests", () => {
    it("makes a PATCH request with a JSON body", async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        makeMockResponse({ json: vi.fn().mockResolvedValue({ id: 1, title: "Updated" }) })
      );
      vi.stubGlobal("fetch", mockFetch);

      await apiClient.patch("/books/1", { title: "Updated" });

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe("http://localhost:3000/books/1");
      expect(options.method).toBe("PATCH");
      expect(options.body).toBe(JSON.stringify({ title: "Updated" }));
    });
  });

  describe("DELETE requests", () => {
    it("makes a DELETE request to the correct URL", async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        makeMockResponse({ status: 204, ok: true, json: vi.fn().mockResolvedValue(null) })
      );
      vi.stubGlobal("fetch", mockFetch);

      await apiClient.delete("/books/1");

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe("http://localhost:3000/books/1");
      expect(options.method).toBe("DELETE");
    });
  });

  describe("204 No Content", () => {
    it("returns undefined for a 204 response", async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        makeMockResponse({ ok: true, status: 204, json: vi.fn().mockResolvedValue(null) })
      );
      vi.stubGlobal("fetch", mockFetch);

      const result = await apiClient.delete("/books/1");
      expect(result).toBeUndefined();
    });
  });

  describe("error handling", () => {
    it("throws ApiError when response is not ok", async () => {
      const errorBody = { message: "Not found" };
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: vi.fn().mockResolvedValue(errorBody),
      });
      vi.stubGlobal("fetch", mockFetch);

      await expect(apiClient.get("/books/999")).rejects.toThrow(ApiError);
    });

    it("ApiError has correct status and data when thrown", async () => {
      const errorBody = { message: "Unauthorized" };
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: vi.fn().mockResolvedValue(errorBody),
      });
      vi.stubGlobal("fetch", mockFetch);

      try {
        await apiClient.get("/protected");
        expect.fail("should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(ApiError);
        const apiErr = err as ApiError;
        expect(apiErr.status).toBe(401);
        expect(apiErr.data).toEqual(errorBody);
      }
    });

    it("falls back to empty object when error response body is not valid JSON", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: vi.fn().mockRejectedValue(new Error("invalid json")),
      });
      vi.stubGlobal("fetch", mockFetch);

      try {
        await apiClient.get("/crash");
        expect.fail("should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(ApiError);
        const apiErr = err as ApiError;
        expect(apiErr.status).toBe(500);
        expect(apiErr.data).toEqual({});
      }
    });
  });

  describe("Authorization header", () => {
    it("does not include Authorization header when there is no token", async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        makeMockResponse({ json: vi.fn().mockResolvedValue([]) })
      );
      vi.stubGlobal("fetch", mockFetch);

      await apiClient.get("/books");

      const [, options] = mockFetch.mock.calls[0];
      expect(options.headers["Authorization"]).toBeUndefined();
    });

    it("adds Authorization header when store has a token", async () => {
      useAuthStore.setState({ token: "test-token", user: null });

      const mockFetch = vi.fn().mockResolvedValue(
        makeMockResponse({ json: vi.fn().mockResolvedValue([]) })
      );
      vi.stubGlobal("fetch", mockFetch);

      await apiClient.get("/books");

      const [, options] = mockFetch.mock.calls[0];
      expect(options.headers["Authorization"]).toBe("Bearer test-token");
    });
  });

  describe("Content-Type header", () => {
    it("always sends Content-Type: application/json", async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        makeMockResponse({ json: vi.fn().mockResolvedValue([]) })
      );
      vi.stubGlobal("fetch", mockFetch);

      await apiClient.get("/books");

      const [, options] = mockFetch.mock.calls[0];
      expect(options.headers["Content-Type"]).toBe("application/json");
    });
  });

  describe("rawPost", () => {
    it("makes a raw POST request and returns the Response object", async () => {
      const mockResponse = makeMockResponse({ json: vi.fn().mockResolvedValue({ ok: true }) });
      const mockFetch = vi.fn().mockResolvedValue(mockResponse);
      vi.stubGlobal("fetch", mockFetch);

      const response = await apiClient.rawPost("/auth/login", { email: "a@b.com" });

      expect(mockFetch).toHaveBeenCalledOnce();
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe("http://localhost:3000/auth/login");
      expect(options.method).toBe("POST");
      expect(options.body).toBe(JSON.stringify({ email: "a@b.com" }));
      // rawPost returns the raw Response, not parsed JSON
      expect(response).toBe(mockResponse);
    });

    it("rawPost sends Authorization header when token is set", async () => {
      useAuthStore.setState({ token: "raw-token", user: null });

      const mockFetch = vi.fn().mockResolvedValue(
        makeMockResponse({ json: vi.fn().mockResolvedValue({}) })
      );
      vi.stubGlobal("fetch", mockFetch);

      await apiClient.rawPost("/auth/refresh");

      const [, options] = mockFetch.mock.calls[0];
      expect(options.headers["Authorization"]).toBe("Bearer raw-token");
    });
  });
});
