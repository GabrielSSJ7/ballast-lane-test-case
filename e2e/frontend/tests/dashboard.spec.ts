import { test, expect } from "@playwright/test";
import { DashboardPage } from "../pages/DashboardPage";

// ─── Librarian dashboard ──────────────────────────────────────────────────────

test.describe("Librarian dashboard", () => {
  test.use({ storageState: "playwright/.auth/librarian.json" });

  test("dashboard shows Total Books stat with a number", async ({ page }) => {
    const dashboardPage = new DashboardPage(page);
    await dashboardPage.goto("librarian");

    const totalBooks = await dashboardPage.getTotalBooks();
    expect(totalBooks).toBeGreaterThan(0);
  });

  test("Currently Borrowed stat is >= 3 (seeded borrowings)", async ({
    page,
  }) => {
    const dashboardPage = new DashboardPage(page);
    await dashboardPage.goto("librarian");

    const totalBorrowed = await dashboardPage.getTotalBorrowed();
    expect(totalBorrowed).toBeGreaterThanOrEqual(3);
  });

  test("dashboard shows Due Today stat card", async ({ page }) => {
    const dashboardPage = new DashboardPage(page);
    await dashboardPage.goto("librarian");

    // Just verify the stat exists and is a number (value may be 0)
    const dueToday = await dashboardPage.getDueToday();
    expect(typeof dueToday).toBe("number");
    expect(isNaN(dueToday)).toBe(false);
  });

  test("dashboard shows Members with Overdue stat card", async ({ page }) => {
    const dashboardPage = new DashboardPage(page);
    await dashboardPage.goto("librarian");

    const membersWithOverdue = await dashboardPage.getMembersWithOverdue();
    // member1 has E2E-010 overdue, so at least 1 member with overdue
    expect(membersWithOverdue).toBeGreaterThanOrEqual(1);
  });

  test("Active Borrowings table is visible and has rows", async ({ page }) => {
    const dashboardPage = new DashboardPage(page);
    await dashboardPage.goto("librarian");

    const hasBorrowingsTable = await dashboardPage.hasBorrowingsTable();
    expect(hasBorrowingsTable).toBe(true);

    const rowCount = await dashboardPage.getBorrowingsTableRowCount();
    expect(rowCount).toBeGreaterThanOrEqual(3);
  });

  test("borrowings table rows have Return buttons", async ({ page }) => {
    const dashboardPage = new DashboardPage(page);
    await dashboardPage.goto("librarian");

    await page.waitForSelector("tbody tr", { timeout: 10000 });

    const returnButtons = page.locator('tbody tr button:text("Return")');
    const count = await returnButtons.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test("dashboard heading shows Librarian Dashboard", async ({ page }) => {
    await page.goto("/dashboard/librarian");
    await page.waitForSelector("h1", { timeout: 10000 });
    const heading = await page.locator("h1").textContent();
    expect(heading).toContain("Librarian Dashboard");
  });
});

// ─── Member1 dashboard ────────────────────────────────────────────────────────

test.describe("Member1 dashboard", () => {
  test.use({ storageState: "playwright/.auth/member.json" });

  test("dashboard shows Currently Borrowing stat (member1 has 2 active)", async ({
    page,
  }) => {
    const dashboardPage = new DashboardPage(page);
    await dashboardPage.goto("member");

    const borrowing = await dashboardPage.getCurrentlyBorrowing();
    expect(borrowing).toBeGreaterThanOrEqual(2);
  });

  test("dashboard shows Overdue Books stat > 0 (member1 has E2E-010 overdue)", async ({
    page,
  }) => {
    const dashboardPage = new DashboardPage(page);
    await dashboardPage.goto("member");

    const overdue = await dashboardPage.getOverdueBooks();
    expect(overdue).toBeGreaterThanOrEqual(1);
  });

  test("member dashboard shows My Borrowings table with rows", async ({
    page,
  }) => {
    const dashboardPage = new DashboardPage(page);
    await dashboardPage.goto("member");

    const hasBorrowingsTable = await dashboardPage.hasBorrowingsTable();
    expect(hasBorrowingsTable).toBe(true);

    const rowCount = await dashboardPage.getBorrowingsTableRowCount();
    expect(rowCount).toBeGreaterThanOrEqual(2);
  });

  test("dashboard heading shows My Dashboard", async ({ page }) => {
    await page.goto("/dashboard/member");
    await page.waitForSelector("h1", { timeout: 10000 });
    const heading = await page.locator("h1").textContent();
    expect(heading).toContain("My Dashboard");
  });

  test("member dashboard does not show return buttons (no librarian actions)", async ({
    page,
  }) => {
    const dashboardPage = new DashboardPage(page);
    await dashboardPage.goto("member");

    // Wait for borrowings table to load
    await page.waitForSelector("table", { timeout: 10000 });

    const returnButtons = page.locator('button:text("Return")');
    const count = await returnButtons.count();
    expect(count).toBe(0);
  });
});
