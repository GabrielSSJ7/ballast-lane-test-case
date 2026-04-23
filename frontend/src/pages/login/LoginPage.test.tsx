import { vi, describe, it, expect, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { LoginPage } from "./LoginPage"

vi.mock("../../features/auth-login/ui/LoginForm", () => ({
  LoginForm: () => <div data-testid="login-form" />,
}))

describe("LoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders 'Sign in to your account' heading", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <LoginPage />
      </MemoryRouter>
    )
    expect(screen.getByText("Sign in to your account")).toBeInTheDocument()
  })

  it("renders the login form", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <LoginPage />
      </MemoryRouter>
    )
    expect(screen.getByTestId("login-form")).toBeInTheDocument()
  })

  it("has a link to /register", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <LoginPage />
      </MemoryRouter>
    )
    const registerLink = screen.getByRole("link", { name: /register/i })
    expect(registerLink).toBeInTheDocument()
    expect(registerLink).toHaveAttribute("href", "/register")
  })
})
