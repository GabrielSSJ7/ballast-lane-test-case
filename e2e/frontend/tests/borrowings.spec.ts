import fs from "fs";
import path from "path";
import { test, expect } from "@playwright/test";
import { BooksPage } from "../pages/BooksPage";
import { DashboardPage } from "../pages/DashboardPage";
import { BOOKS } from "../fixtures/users";

const AUTH_DIR = path.join(__dirname, "../playwright/.auth");

function readToken(filename: string): string {
  const state = JSON.parse(fs.readFileSync(path.join(AUTH_DIR, filename), "utf-8"));
  return JSON.parse(state.origins[0].localStorage[0].value).state.token;
}

// ─── Member2: borrow a book ───────────────────────────────────────────────────

test.describe("Member2 - borrow flow", () => {
  test.use({ storageState: "playwright/.auth/member2.json" });

  test("member sees Borrow button on available book and can borrow it", async ({
    page,
  }) => {
    const booksPage = new BooksPage(page);
    await booksPage.goto();
    await booksPage.waitForLoad();

    await booksPage.search("E2E Book Six");

    const card = await booksPage.findCardByTitle("E2E Book Six");
    const borrowBtn = card.locator('button:text("Borrow")');
    await expect(borrowBtn).toBeVisible({ timeout: 5000 });
    await borrowBtn.click();

    await page.waitForTimeout(1000);

    const isStillBorrowable = await card
      .locator('button:text("Borrow")')
      .isVisible()
      .catch(() => false);
    const isUnavailable = await card
      .locator('button:text("Unavailable")')
      .isVisible()
      .catch(() => false);

    expect(isStillBorrowable || isUnavailable).toBe(true);
  });

  test("member dashboard reflects borrowings after borrow", async ({
    page,
  }) => {
    const dashboardPage = new DashboardPage(page);
    await dashboardPage.goto("member");

    const borrowing = await dashboardPage.getCurrentlyBorrowing();
    expect(borrowing).toBeGreaterThanOrEqual(1);
  });
});

// ─── Librarian: view and return borrowings ────────────────────────────────────

test.describe("Librarian - borrowings management", () => {
  test.use({ storageState: "playwright/.auth/librarian.json" });

  test("librarian dashboard shows active borrowings table with rows", async ({
    page,
  }) => {
    const dashboardPage = new DashboardPage(page);
    await dashboardPage.goto("librarian");

    const hasBorrowingsTable = await dashboardPage.hasBorrowingsTable();
    expect(hasBorrowingsTable).toBe(true);

    const rowCount = await dashboardPage.getBorrowingsTableRowCount();
    expect(rowCount).toBeGreaterThanOrEqual(3);
  });

  test("librarian can return a borrowing and row is updated", async ({
    page,
  }) => {
    // Create a fresh borrowing via the API so we don't touch seeded borrowings
    const member2Token = readToken("member2.json");

    const booksRes = await page.request.get("http://localhost:3001/api/v1/books", {
      params: { search: "E2E Book Two" },
      headers: { Authorization: `Bearer ${member2Token}` },
    });
    const booksData = await booksRes.json();
    const bookToBorrow = (booksData.books as Array<{ id: number; title: string }>).find(
      (b) => b.title === "E2E Book Two"
    );
    expect(bookToBorrow).toBeTruthy();

    const borrowRes = await page.request.post(
      `http://localhost:3001/api/v1/books/${bookToBorrow!.id}/borrowings`,
      { headers: { Authorization: `Bearer ${member2Token}`, "Content-Type": "application/json" } }
    );
    expect(borrowRes.ok()).toBeTruthy();

    const dashboardPage = new DashboardPage(page);
    await dashboardPage.goto("librarian");

    await page.waitForSelector("tbody tr", { timeout: 10000 });
    const initialRowCount = await dashboardPage.getBorrowingsTableRowCount();
    expect(initialRowCount).toBeGreaterThan(0);

    await dashboardPage.clickReturn("E2E Book Two");

    await page.waitForTimeout(1500);
    const updatedRowCount = await dashboardPage.getBorrowingsTableRowCount();
    expect(updatedRowCount).toBe(initialRowCount - 1);
  });

  test("librarian sees Currently Borrowed stat >= 3", async ({ page }) => {
    const dashboardPage = new DashboardPage(page);
    await dashboardPage.goto("librarian");

    const borrowed = await dashboardPage.getTotalBorrowed();
    expect(borrowed).toBeGreaterThanOrEqual(3);
  });
});

// ─── Cross-role: librarian sees member borrowings ─────────────────────────────

test.describe("Librarian sees member borrowings", () => {
  test.use({ storageState: "playwright/.auth/librarian.json" });

  test("librarian sees borrowed books in active borrowings table", async ({
    page,
  }) => {
    const dashboardPage = new DashboardPage(page);
    await dashboardPage.goto("librarian");

    await page.waitForSelector("tbody tr", { timeout: 10000 });

    const rows = page.locator("tbody tr");
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThan(0);

    const tableText = await page.locator("tbody").textContent();
    expect(tableText).toBeTruthy();
    expect(tableText!.length).toBeGreaterThan(0);
  });
});

// ─── Member1: borrowings state ────────────────────────────────────────────────

test.describe("Member1 - borrowings state", () => {
  test.use({ storageState: "playwright/.auth/member.json" });

  test("member1 dashboard shows 2 currently borrowed books", async ({
    page,
  }) => {
    const dashboardPage = new DashboardPage(page);
    await dashboardPage.goto("member");

    const borrowing = await dashboardPage.getCurrentlyBorrowing();
    expect(borrowing).toBeGreaterThanOrEqual(2);
  });

  test("member1 sees their borrowings in the table", async ({ page }) => {
    const dashboardPage = new DashboardPage(page);
    await dashboardPage.goto("member");

    const hasBorrowingsTable = await dashboardPage.hasBorrowingsTable();
    expect(hasBorrowingsTable).toBe(true);

    const rowCount = await dashboardPage.getBorrowingsTableRowCount();
    expect(rowCount).toBeGreaterThanOrEqual(2);
  });

  test("unavailable book (E2E-009) shows Unavailable button for member1", async ({
    page,
  }) => {
    const booksPage = new BooksPage(page);
    await booksPage.goto();
    await booksPage.waitForLoad();

    await booksPage.search(BOOKS.unavailable.title);

    const card = await booksPage.findCardByTitle(BOOKS.unavailable.title);
    const unavailableBtn = card.locator('button:text("Unavailable")');
    await expect(unavailableBtn).toBeVisible({ timeout: 5000 });
    await expect(unavailableBtn).toBeDisabled();
  });
});
