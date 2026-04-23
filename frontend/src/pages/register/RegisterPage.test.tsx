import { vi, describe, it, expect, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { RegisterPage } from "./RegisterPage"

vi.mock("../../features/auth-register/ui/RegisterForm", () => ({
  RegisterForm: () => <div data-testid="register-form" />,
}))

describe("RegisterPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders 'Create your account' heading", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <RegisterPage />
      </MemoryRouter>
    )
    expect(screen.getByText("Create your account")).toBeInTheDocument()
  })

  it("renders the register form", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <RegisterPage />
      </MemoryRouter>
    )
    expect(screen.getByTestId("register-form")).toBeInTheDocument()
  })

  it("has a link to /login", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <RegisterPage />
      </MemoryRouter>
    )
    const loginLink = screen.getByRole("link", { name: /sign in/i })
    expect(loginLink).toBeInTheDocument()
    expect(loginLink).toHaveAttribute("href", "/login")
  })
})
