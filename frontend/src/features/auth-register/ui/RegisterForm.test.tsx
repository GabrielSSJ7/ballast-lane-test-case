import { vi, describe, it, expect, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router"
import { RegisterForm } from "./RegisterForm"
import { useAuthStore } from "../../../entities/user/model/store"

const mockNavigate = vi.fn()
vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>()
  return { ...actual, useNavigate: () => mockNavigate }
})

const mockFetch = vi.fn()

describe("RegisterForm", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal("fetch", mockFetch)
    useAuthStore.setState({ token: null, user: null })
  })

  it("renders name, email, and password inputs", () => {
    render(
      <MemoryRouter>
        <RegisterForm />
      </MemoryRouter>
    )

    expect(screen.getByLabelText("Name")).toBeInTheDocument()
    expect(screen.getByLabelText("Email")).toBeInTheDocument()
    expect(screen.getByLabelText("Password")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /create account/i })).toBeInTheDocument()
  })

  it("shows validation error when name is empty", async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <RegisterForm />
      </MemoryRouter>
    )

    await user.type(screen.getByLabelText("Email"), "a@a.com")
    await user.type(screen.getByLabelText("Password"), "password123")
    await user.click(screen.getByRole("button", { name: /create account/i }))

    await waitFor(() => {
      expect(screen.getByText("Name is required")).toBeInTheDocument()
    })
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it("shows validation error when email is empty", async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <RegisterForm />
      </MemoryRouter>
    )

    // Type name and password but leave email empty — Zod catches empty string as invalid email
    await user.type(screen.getByLabelText("Name"), "Alice")
    await user.type(screen.getByLabelText("Password"), "password123")
    await user.click(screen.getByRole("button", { name: /create account/i }))

    await waitFor(() => {
      expect(screen.getByText("Invalid email address")).toBeInTheDocument()
    })
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it("shows validation error for short password", async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <RegisterForm />
      </MemoryRouter>
    )

    await user.type(screen.getByLabelText("Name"), "Alice")
    await user.type(screen.getByLabelText("Email"), "a@a.com")
    await user.type(screen.getByLabelText("Password"), "short")
    await user.click(screen.getByRole("button", { name: /create account/i }))

    await waitFor(() => {
      expect(screen.getByText("Password must be at least 8 characters")).toBeInTheDocument()
    })
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it("calls fetch on valid submit with correct URL and body", async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue({
      ok: true,
      headers: { get: () => "Bearer test-token" },
      json: () => Promise.resolve({ id: 1, name: "Alice", email: "a@a.com", role: "member" }),
    })

    render(
      <MemoryRouter>
        <RegisterForm />
      </MemoryRouter>
    )

    await user.type(screen.getByLabelText("Name"), "Alice")
    await user.type(screen.getByLabelText("Email"), "a@a.com")
    await user.type(screen.getByLabelText("Password"), "password123")
    await user.click(screen.getByRole("button", { name: /create account/i }))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledOnce()
    })

    const [url, options] = mockFetch.mock.calls[0]
    expect(url).toContain("/api/v1/auth/register")
    expect(options.method).toBe("POST")
    expect(JSON.parse(options.body)).toEqual({
      user: { name: "Alice", email: "a@a.com", password: "password123" },
    })
  })

  it("on success: calls setAuth and navigates to /dashboard/member", async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue({
      ok: true,
      headers: { get: () => "Bearer test-token" },
      json: () => Promise.resolve({ id: 1, name: "Alice", email: "a@a.com", role: "member" }),
    })

    render(
      <MemoryRouter>
        <RegisterForm />
      </MemoryRouter>
    )

    await user.type(screen.getByLabelText("Name"), "Alice")
    await user.type(screen.getByLabelText("Email"), "a@a.com")
    await user.type(screen.getByLabelText("Password"), "password123")
    await user.click(screen.getByRole("button", { name: /create account/i }))

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard/member")
    })

    const { token, user: storedUser } = useAuthStore.getState()
    expect(token).toBe("test-token")
    expect(storedUser).toEqual({ id: 1, name: "Alice", email: "a@a.com", role: "member" })
  })

  it("on error response: shows generic error message", async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue({
      ok: false,
      status: 422,
      headers: { get: () => null },
      json: () => Promise.resolve({ error: "Registration failed. Please check your details." }),
    })

    render(
      <MemoryRouter>
        <RegisterForm />
      </MemoryRouter>
    )

    await user.type(screen.getByLabelText("Name"), "Alice")
    await user.type(screen.getByLabelText("Email"), "a@a.com")
    await user.type(screen.getByLabelText("Password"), "password123")
    await user.click(screen.getByRole("button", { name: /create account/i }))

    await waitFor(() => {
      expect(screen.getByText("Registration failed. Please check your details.")).toBeInTheDocument()
    })
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it("on network error: shows 'Network error' message", async () => {
    const user = userEvent.setup()
    mockFetch.mockRejectedValue(new Error("Network failed"))

    render(
      <MemoryRouter>
        <RegisterForm />
      </MemoryRouter>
    )

    await user.type(screen.getByLabelText("Name"), "Alice")
    await user.type(screen.getByLabelText("Email"), "a@a.com")
    await user.type(screen.getByLabelText("Password"), "password123")
    await user.click(screen.getByRole("button", { name: /create account/i }))

    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeInTheDocument()
    })
    expect(mockNavigate).not.toHaveBeenCalled()
  })
})
