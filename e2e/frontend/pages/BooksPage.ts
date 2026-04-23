import { Page, expect } from "@playwright/test";

export interface BookFormData {
  title: string;
  author: string;
  genre: string;
  isbn: string;
  total_copies: number;
}

export class BooksPage {
  constructor(private page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto("/books");
  }

  async waitForLoad(): Promise<void> {
    // Wait for at least one book card or empty state message to appear
    await this.page.waitForSelector(
      'h3, .text-center',
      { timeout: 15000 }
    );
  }

  async search(query: string): Promise<void> {
    const searchInput = this.page.locator('input[type="search"]');
    await searchInput.clear();
    await searchInput.fill(query);
    // Wait for debounce (300ms) + some buffer
    await this.page.waitForTimeout(400);
  }

  async clearSearch(): Promise<void> {
    const searchInput = this.page.locator('input[type="search"]');
    await searchInput.clear();
    await this.page.waitForTimeout(400);
  }

  async getBookTitles(): Promise<string[]> {
    // Book titles are in h3 elements inside book cards
    await this.page.waitForSelector(
      '.grid h3, .text-center',
      { timeout: 10000 }
    );
    const titles = await this.page.locator('.grid h3').allTextContents();
    return titles.map((t) => t.trim());
  }

  async clickAddBook(): Promise<void> {
    await this.page.click('a[href="/books/new"]');
    await this.page.waitForURL(/\/books\/new/);
  }

  async hasAddBookButton(): Promise<boolean> {
    const btn = this.page.locator('a[href="/books/new"]');
    return await btn.isVisible();
  }

  async findCardByTitle(title: string) {
    return this.page.locator('.grid > div').filter({
      has: this.page.locator(`h3:text-is("${title}")`),
    });
  }

  async clickBorrow(bookTitle: string): Promise<void> {
    const card = await this.findCardByTitle(bookTitle);
    await card.locator('button:text("Borrow")').click();
  }

  async clickEdit(bookTitle: string): Promise<void> {
    const card = await this.findCardByTitle(bookTitle);
    await card.locator('a').locator('button:text("Edit")').click();
    await this.page.waitForURL(/\/books\/\d+\/edit/);
  }

  async clickDelete(bookTitle: string): Promise<void> {
    // Set up dialog handler before clicking delete
    this.page.once("dialog", (dialog) => dialog.accept());
    const card = await this.findCardByTitle(bookTitle);
    await card.locator('button:text("Delete")').click();
  }

  async fillBookForm(data: BookFormData): Promise<void> {
    // Input IDs are auto-generated from labels (lowercase, spaces→dashes)
    await this.page.fill("#title", data.title);
    await this.page.fill("#author", data.author);
    await this.page.fill("#genre", data.genre);
    await this.page.fill("#isbn", data.isbn);
    await this.page.fill("#total-copies", String(data.total_copies));
  }

  async submitBookForm(): Promise<void> {
    await this.page.click('button[type="submit"]');
    await this.page.waitForURL("/books", { timeout: 15000 });
  }

  async clickNextPage(): Promise<void> {
    await this.page.click('button:text("Next")');
    await this.page.waitForSelector('text=Page 2 of', { timeout: 10000 });
  }

  async clickPrevPage(): Promise<void> {
    await this.page.click('button:text("Previous")');
    // SWR serves page 1 from cache (no new network request); wait for page indicator
    await this.page.waitForSelector('text=Page 1 of', { timeout: 5000 });
  }

  async hasPagination(): Promise<boolean> {
    const nextBtn = this.page.locator('button:text("Next")');
    return await nextBtn.isVisible();
  }

  async isBookVisible(title: string): Promise<boolean> {
    const card = this.page.locator('.grid h3').filter({ hasText: title });
    return await card.isVisible().catch(() => false);
  }

  async waitForBookGone(title: string): Promise<void> {
    await expect(
      this.page.locator('.grid h3').filter({ hasText: title })
    ).not.toBeVisible({ timeout: 10000 });
  }
}
