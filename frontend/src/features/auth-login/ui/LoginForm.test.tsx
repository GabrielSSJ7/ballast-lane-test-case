import { vi, describe, it, expect, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router"
import { LoginForm } from "./LoginForm"
import { useAuthStore } from "../../../entities/user/model/store"

const mockNavigate = vi.fn()
vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>()
  return { ...actual, useNavigate: () => mockNavigate }
})

const mockFetch = vi.fn()

describe("LoginForm", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal("fetch", mockFetch)
    useAuthStore.setState({ token: null, user: null })
  })

  it("renders email and password inputs and submit button", () => {
    render(
      <MemoryRouter>
        <LoginForm />
      </MemoryRouter>
    )

    expect(screen.getByLabelText("Email")).toBeInTheDocument()
    expect(screen.getByLabelText("Password")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument()
  })

  it("shows validation error when email is empty", async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <LoginForm />
      </MemoryRouter>
    )

    // Submit without entering email — Zod catches empty string as invalid email
    await user.type(screen.getByLabelText("Password"), "password123")
    await user.click(screen.getByRole("button", { name: /sign in/i }))

    await waitFor(() => {
      expect(screen.getByText("Invalid email address")).toBeInTheDocument()
    })
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it("calls fetch on submit with correct URL and body", async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue({
      ok: true,
      headers: { get: () => "Bearer test-token" },
      json: () => Promise.resolve({ id: 1, name: "Alice", email: "a@a.com", role: "librarian" }),
    })

    render(
      <MemoryRouter>
        <LoginForm />
      </MemoryRouter>
    )

    await user.type(screen.getByLabelText("Email"), "a@a.com")
    await user.type(screen.getByLabelText("Password"), "password123")
    await user.click(screen.getByRole("button", { name: /sign in/i }))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledOnce()
    })

    const [url, options] = mockFetch.mock.calls[0]
    expect(url).toContain("/api/v1/auth/login")
    expect(options.method).toBe("POST")
    expect(JSON.parse(options.body)).toEqual({
      user: { email: "a@a.com", password: "password123" },
    })
  })

  it("on success: reads Authorization header, calls setAuth, navigates to librarian dashboard for librarian role", async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue({
      ok: true,
      headers: { get: () => "Bearer test-token" },
      json: () => Promise.resolve({ id: 1, name: "Alice", email: "a@a.com", role: "librarian" }),
    })

    render(
      <MemoryRouter>
        <LoginForm />
      </MemoryRouter>
    )

    await user.type(screen.getByLabelText("Email"), "a@a.com")
    await user.type(screen.getByLabelText("Password"), "password123")
    await user.click(screen.getByRole("button", { name: /sign in/i }))

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard/librarian")
    })

    const { token, user: storedUser } = useAuthStore.getState()
    expect(token).toBe("test-token")
    expect(storedUser).toEqual({ id: 1, name: "Alice", email: "a@a.com", role: "librarian" })
  })

  it("on success: navigates to member dashboard for member role", async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue({
      ok: true,
      headers: { get: () => "Bearer member-token" },
      json: () => Promise.resolve({ id: 2, name: "Bob", email: "b@b.com", role: "member" }),
    })

    render(
      <MemoryRouter>
        <LoginForm />
      </MemoryRouter>
    )

    await user.type(screen.getByLabelText("Email"), "b@b.com")
    await user.type(screen.getByLabelText("Password"), "password123")
    await user.click(screen.getByRole("button", { name: /sign in/i }))

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard/member")
    })
  })

  it("on 401 response: shows 'Invalid email or password' error", async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      headers: { get: () => null },
      json: () => Promise.resolve({}),
    })

    render(
      <MemoryRouter>
        <LoginForm />
      </MemoryRouter>
    )

    await user.type(screen.getByLabelText("Email"), "a@a.com")
    await user.type(screen.getByLabelText("Password"), "password123")
    await user.click(screen.getByRole("button", { name: /sign in/i }))

    await waitFor(() => {
      expect(screen.getByText("Invalid email or password")).toBeInTheDocument()
    })
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it("on network error (fetch throws): shows 'Network error' message", async () => {
    const user = userEvent.setup()
    mockFetch.mockRejectedValue(new Error("Network failed"))

    render(
      <MemoryRouter>
        <LoginForm />
      </MemoryRouter>
    )

    await user.type(screen.getByLabelText("Email"), "a@a.com")
    await user.type(screen.getByLabelText("Password"), "password123")
    await user.click(screen.getByRole("button", { name: /sign in/i }))

    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeInTheDocument()
    })
    expect(mockNavigate).not.toHaveBeenCalled()
  })
})
