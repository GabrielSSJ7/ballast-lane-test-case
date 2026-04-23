import { test, expect } from "@playwright/test";
import { LoginPage } from "../pages/LoginPage";
import { USERS } from "../fixtures/users";

// ─── Guest (unauthenticated) tests ───────────────────────────────────────────

test.describe("Guest - unauthenticated flows", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("register as new member and redirect to member dashboard", async ({
    page,
  }) => {
    const timestamp = Date.now();
    await page.goto("/register");

    await page.fill("#name", `Test User ${timestamp}`);
    await page.fill("#email", `testuser_${timestamp}@example.com`);
    await page.fill("#password", "password123");

    await page.click('button[type="submit"]');

    await page.waitForURL("/dashboard/member", { timeout: 15000 });
    expect(page.url()).toContain("/dashboard/member");
  });

  test("unauthenticated user navigating to /books is redirected to /login", async ({
    page,
  }) => {
    await page.goto("/books");
    await page.waitForURL("/login", { timeout: 10000 });
    expect(page.url()).toContain("/login");
  });

  test("login with wrong password shows inline error without redirect", async ({
    page,
  }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(USERS.member1.email, "wrong_password");

    const errorText = await loginPage.getErrorText();
    expect(errorText).toBeTruthy();
    expect(errorText).toContain("Invalid email or password");

    expect(page.url()).toContain("/login");
  });
});

// ─── Logout flow (uses fresh login to avoid blacklisting saved tokens) ────────

test.describe("Logout flow", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("logout clears auth and subsequent navigation to /books redirects to /login", async ({
    page,
  }) => {
    // Log in fresh via UI so the pre-saved member.json token is not blacklisted
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(USERS.member1.email, USERS.member1.password);
    await page.waitForURL("/dashboard/member", { timeout: 15000 });

    await page.click('button:text("Sign Out")');
    await page.waitForURL("/login", { timeout: 10000 });
    expect(page.url()).toContain("/login");

    await page.goto("/books");
    await page.waitForURL("/login", { timeout: 10000 });
    expect(page.url()).toContain("/login");
  });
});

// ─── Member (authenticated) tests ────────────────────────────────────────────

test.describe("Member - authenticated flows", () => {
  test.use({ storageState: "playwright/.auth/member.json" });

  test("navigating to / redirects to /dashboard/member", async ({ page }) => {
    await page.goto("/");
    await page.waitForURL("/dashboard/member", { timeout: 10000 });
    expect(page.url()).toContain("/dashboard/member");
  });

  test("logged-in member navigating to /login is redirected to member dashboard", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.waitForURL("/dashboard/member", { timeout: 10000 });
    expect(page.url()).toContain("/dashboard/member");
  });

  test("member navigates to /dashboard/librarian and is redirected to /dashboard/member", async ({
    page,
  }) => {
    await page.goto("/dashboard/librarian");
    await page.waitForURL("/dashboard/member", { timeout: 10000 });
    expect(page.url()).toContain("/dashboard/member");
  });
});

// ─── Librarian (authenticated) tests ─────────────────────────────────────────

test.describe("Librarian - authenticated flows", () => {
  test.use({ storageState: "playwright/.auth/librarian.json" });

  test("navigating to / redirects to /dashboard/librarian", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForURL("/dashboard/librarian", { timeout: 10000 });
    expect(page.url()).toContain("/dashboard/librarian");
  });

  test("logged-in librarian navigating to /login is redirected to librarian dashboard", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.waitForURL("/dashboard/librarian", { timeout: 10000 });
    expect(page.url()).toContain("/dashboard/librarian");
  });

  test("librarian navigates to /dashboard/member and is redirected to /dashboard/librarian", async ({
    page,
  }) => {
    await page.goto("/dashboard/member");
    await page.waitForURL("/dashboard/librarian", { timeout: 10000 });
    expect(page.url()).toContain("/dashboard/librarian");
  });
});
