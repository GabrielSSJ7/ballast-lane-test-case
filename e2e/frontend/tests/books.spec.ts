import { test, expect } from "@playwright/test";
import { BooksPage } from "../pages/BooksPage";
import { BOOKS } from "../fixtures/users";

// ─── Guest: unauthenticated ───────────────────────────────────────────────────

test.describe("Guest - books access", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("navigating to /books redirects to /login when unauthenticated", async ({
    page,
  }) => {
    await page.goto("/books");
    await page.waitForURL("/login", { timeout: 10000 });
    expect(page.url()).toContain("/login");
  });
});

// ─── Member: book browsing ────────────────────────────────────────────────────

test.describe("Member - books browsing", () => {
  test.use({ storageState: "playwright/.auth/member.json" });

  test("books page loads with a grid of book cards", async ({ page }) => {
    const booksPage = new BooksPage(page);
    await booksPage.goto();
    await booksPage.waitForLoad();

    const titles = await booksPage.getBookTitles();
    expect(titles.length).toBeGreaterThanOrEqual(10);
  });

  test("search filters visible books and shows matching result", async ({
    page,
  }) => {
    const booksPage = new BooksPage(page);
    await booksPage.goto();
    await booksPage.waitForLoad();

    await booksPage.search("E2E Borrowed");
    // After debounce, only matching books should be visible
    const titles = await booksPage.getBookTitles();
    expect(titles.some((t) => t.includes("E2E Borrowed"))).toBe(true);
    // There should be fewer results than full list
    expect(titles.length).toBeLessThan(15);
  });

  test("clearing search restores more books", async ({ page }) => {
    const booksPage = new BooksPage(page);
    await booksPage.goto();
    await booksPage.waitForLoad();

    await booksPage.search("E2E Borrowed");
    const filteredTitles = await booksPage.getBookTitles();

    await booksPage.clearSearch();
    const allTitles = await booksPage.getBookTitles();
    expect(allTitles.length).toBeGreaterThan(filteredTitles.length);
  });

  test("member does NOT see the Add Book button", async ({ page }) => {
    const booksPage = new BooksPage(page);
    await booksPage.goto();
    await booksPage.waitForLoad();

    const hasAddBook = await booksPage.hasAddBookButton();
    expect(hasAddBook).toBe(false);
  });

  test("member sees Borrow button on available books", async ({ page }) => {
    const booksPage = new BooksPage(page);
    await booksPage.goto();
    await booksPage.waitForLoad();

    // Search for a known available book
    await booksPage.search(BOOKS.available.title);
    const card = await booksPage.findCardByTitle(BOOKS.available.title);
    await expect(card.locator('button:text("Borrow")')).toBeVisible({
      timeout: 5000,
    });
  });

  test("unavailable book shows Unavailable button (disabled) instead of Borrow", async ({
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

// ─── Librarian: book management ───────────────────────────────────────────────

test.describe("Librarian - book management", () => {
  test.use({ storageState: "playwright/.auth/librarian.json" });

  test("librarian sees Add Book button", async ({ page }) => {
    const booksPage = new BooksPage(page);
    await booksPage.goto();
    await booksPage.waitForLoad();

    const hasAddBook = await booksPage.hasAddBookButton();
    expect(hasAddBook).toBe(true);
  });

  test("librarian sees Edit and Delete controls on book cards", async ({
    page,
  }) => {
    const booksPage = new BooksPage(page);
    await booksPage.goto();
    await booksPage.waitForLoad();

    // At least one Edit button visible
    const editButtons = page.locator('.grid button:text("Edit")');
    await expect(editButtons.first()).toBeVisible({ timeout: 5000 });

    const deleteButtons = page.locator('.grid button:text("Delete")');
    await expect(deleteButtons.first()).toBeVisible({ timeout: 5000 });
  });

  test("librarian can create a new book and it appears in the list", async ({
    page,
  }) => {
    const booksPage = new BooksPage(page);
    await booksPage.goto();
    await booksPage.waitForLoad();

    const timestamp = Date.now();
    const newTitle = `E2E New Book ${timestamp}`;

    await booksPage.clickAddBook();

    await booksPage.fillBookForm({
      title: newTitle,
      author: "E2E Author",
      genre: "Testing",
      isbn: `TST-${timestamp.toString().slice(-6)}`,
      total_copies: 3,
    });

    await booksPage.submitBookForm();

    // After redirect back to /books, search for the new book
    await booksPage.search(newTitle);
    const visible = await booksPage.isBookVisible(newTitle);
    expect(visible).toBe(true);
  });

  test("librarian can edit a book and updated title appears in list", async ({
    page,
  }) => {
    const booksPage = new BooksPage(page);
    await booksPage.goto();
    await booksPage.waitForLoad();

    // Use the known overdue book for editing (safe, won't affect borrow tests)
    await booksPage.search("E2E Book Seven");
    const originalTitle = "E2E Book Seven";

    // Check if the book is visible first
    const originalVisible = await booksPage.isBookVisible(originalTitle);
    if (!originalVisible) {
      // Try without filtering
      await booksPage.clearSearch();
    }

    const timestamp = Date.now();
    const updatedTitle = `E2E Book Seven Edited ${timestamp}`;

    await booksPage.clickEdit(originalTitle);

    // Clear and fill the title field
    await page.fill("#title", updatedTitle);
    await booksPage.submitBookForm();

    // Should be back at /books, search for updated title
    await booksPage.search(updatedTitle);
    const updatedVisible = await booksPage.isBookVisible(updatedTitle);
    expect(updatedVisible).toBe(true);

    // Restore the book name for other test runs (best-effort)
    await booksPage.clickEdit(updatedTitle);
    await page.fill("#title", originalTitle);
    await booksPage.submitBookForm();
  });

  test("librarian can delete a book and it is removed from the list", async ({
    page,
  }) => {
    // First create a book to delete so we don't affect seed data
    const booksPage = new BooksPage(page);
    await booksPage.goto();
    await booksPage.waitForLoad();

    const timestamp = Date.now();
    const deleteTitle = `E2E Delete Me ${timestamp}`;

    await booksPage.clickAddBook();
    await booksPage.fillBookForm({
      title: deleteTitle,
      author: "Delete Author",
      genre: "Filler",
      isbn: `DEL-${timestamp.toString().slice(-6)}`,
      total_copies: 1,
    });
    await booksPage.submitBookForm();

    // Search for it and delete
    await booksPage.search(deleteTitle);
    const visible = await booksPage.isBookVisible(deleteTitle);
    expect(visible).toBe(true);

    await booksPage.clickDelete(deleteTitle);

    // After deletion, verify it is gone
    await booksPage.waitForBookGone(deleteTitle);
    const stillVisible = await booksPage.isBookVisible(deleteTitle);
    expect(stillVisible).toBe(false);
  });

  test("pagination shows Next button and clicking it loads different books", async ({
    page,
  }) => {
    const booksPage = new BooksPage(page);
    await booksPage.goto();
    await booksPage.waitForLoad();

    const hasPagination = await booksPage.hasPagination();
    expect(hasPagination).toBe(true);

    const firstPageTitles = await booksPage.getBookTitles();
    await booksPage.clickNextPage();

    const secondPageTitles = await booksPage.getBookTitles();
    // Second page books should be different from first page
    expect(secondPageTitles.length).toBeGreaterThan(0);
    const hasOverlap = firstPageTitles.some((t) =>
      secondPageTitles.includes(t)
    );
    expect(hasOverlap).toBe(false);

    // Click Previous to go back
    await booksPage.clickPrevPage();
    const backToFirstTitles = await booksPage.getBookTitles();
    expect(backToFirstTitles).toEqual(firstPageTitles);
  });
});
