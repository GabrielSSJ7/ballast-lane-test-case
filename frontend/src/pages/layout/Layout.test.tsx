import { vi, describe, it, expect, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { Layout } from "./Layout"
import { useAuthStore } from "../../entities/user/model/store"

vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>()
  return { ...actual, Outlet: () => <div data-testid="outlet-content" /> }
})

vi.mock("../../features/auth-logout/ui/LogoutButton", () => ({
  LogoutButton: () => <button>Sign Out</button>,
}))

describe("Layout", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders 'Library' heading/link", async () => {
    useAuthStore.setState({
      token: "t",
      user: { id: 1, name: "Alice", email: "a@a.com", role: "member" },
    })

    render(
      <MemoryRouter initialEntries={["/"]}>
        <Layout />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByRole("link", { name: /library/i })).toBeInTheDocument()
    })
  })

  it("renders Books nav link", async () => {
    useAuthStore.setState({
      token: "t",
      user: { id: 1, name: "Alice", email: "a@a.com", role: "member" },
    })

    render(
      <MemoryRouter initialEntries={["/"]}>
        <Layout />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByRole("link", { name: "Books" })).toBeInTheDocument()
    })
    expect(screen.getByRole("link", { name: "Books" })).toHaveAttribute(
      "href",
      "/books"
    )
  })

  it("shows librarian dashboard link for librarian role", async () => {
    useAuthStore.setState({
      token: "t",
      user: { id: 2, name: "Lib", email: "lib@lib.com", role: "librarian" },
    })

    render(
      <MemoryRouter initialEntries={["/"]}>
        <Layout />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute(
        "href",
        "/dashboard/librarian"
      )
    })
  })

  it("shows member dashboard link for member role", async () => {
    useAuthStore.setState({
      token: "t",
      user: { id: 1, name: "Alice", email: "a@a.com", role: "member" },
    })

    render(
      <MemoryRouter initialEntries={["/"]}>
        <Layout />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute(
        "href",
        "/dashboard/member"
      )
    })
  })

  it("renders user name and role in header", async () => {
    useAuthStore.setState({
      token: "t",
      user: { id: 1, name: "Alice", email: "a@a.com", role: "member" },
    })

    render(
      <MemoryRouter initialEntries={["/"]}>
        <Layout />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText("Alice (member)")).toBeInTheDocument()
    })
  })

  it("renders outlet", async () => {
    useAuthStore.setState({
      token: "t",
      user: { id: 1, name: "Alice", email: "a@a.com", role: "member" },
    })

    render(
      <MemoryRouter initialEntries={["/"]}>
        <Layout />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByTestId("outlet-content")).toBeInTheDocument()
    })
  })
})
