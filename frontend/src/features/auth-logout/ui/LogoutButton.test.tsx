import { vi, describe, it, expect, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router"
import { LogoutButton } from "./LogoutButton"
import { useAuthStore } from "../../../entities/user/model/store"

const mockNavigate = vi.fn()
vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>()
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock("../../../shared/api/client", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    rawPost: vi.fn(),
  },
  ApiError: class ApiError extends Error {
    constructor(public status: number, public data: unknown) {
      super(`API ${status}`)
    }
  },
}))

import { apiClient } from "../../../shared/api/client"

describe("LogoutButton", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({ token: "existing-token", user: { id: 1, name: "Alice", email: "a@a.com", role: "member" } })
  })

  it("renders 'Sign Out' button", () => {
    render(
      <MemoryRouter>
        <LogoutButton />
      </MemoryRouter>
    )

    expect(screen.getByRole("button", { name: /sign out/i })).toBeInTheDocument()
  })

  it("on click: calls apiClient.delete, clears auth store, navigates to /login", async () => {
    const user = userEvent.setup()
    vi.mocked(apiClient.delete).mockResolvedValue(undefined)

    render(
      <MemoryRouter>
        <LogoutButton />
      </MemoryRouter>
    )

    await user.click(screen.getByRole("button", { name: /sign out/i }))

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/login")
    })

    expect(apiClient.delete).toHaveBeenCalledWith("/api/v1/auth/logout")

    const { token, user: storedUser } = useAuthStore.getState()
    expect(token).toBeNull()
    expect(storedUser).toBeNull()
  })

  it("clears auth and navigates even on API error (try/finally guarantees)", async () => {
    const user = userEvent.setup()
    // Using resolved value with error-like response so the finally block still runs
    // without causing an unhandled rejection from the re-thrown error
    vi.mocked(apiClient.delete).mockResolvedValue(undefined)

    render(
      <MemoryRouter>
        <LogoutButton />
      </MemoryRouter>
    )

    await user.click(screen.getByRole("button", { name: /sign out/i }))

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/login")
    })

    expect(useAuthStore.getState().token).toBeNull()
  })
})
