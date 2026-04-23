import { Page } from "@playwright/test";

export class DashboardPage {
  constructor(private page: Page) {}

  async goto(role: "librarian" | "member"): Promise<void> {
    await this.page.goto(`/dashboard/${role}`);
    // Wait for stat cards to render
    await this.page.waitForSelector("p.text-3xl", { timeout: 15000 });
  }

  private async getStatValue(labelText: string): Promise<number> {
    const valueText = await this.page
      .locator(`p:text-is("${labelText}")`)
      .locator("xpath=following-sibling::p[1]")
      .textContent();
    const cleaned = (valueText ?? "").trim().replace("—", "0");
    return parseInt(cleaned, 10);
  }

  // Librarian dashboard stats
  async getTotalBooks(): Promise<number> {
    return this.getStatValue("Total Books");
  }

  async getTotalBorrowed(): Promise<number> {
    return this.getStatValue("Currently Borrowed");
  }

  async getDueToday(): Promise<number> {
    return this.getStatValue("Due Today");
  }

  async getMembersWithOverdue(): Promise<number> {
    return this.getStatValue("Members with Overdue");
  }

  // Member dashboard stats
  async getCurrentlyBorrowing(): Promise<number> {
    return this.getStatValue("Currently Borrowing");
  }

  async getOverdueBooks(): Promise<number> {
    return this.getStatValue("Overdue Books");
  }

  async getBorrowingsTableRowCount(): Promise<number> {
    // Table rows in the borrowings table (tbody tr)
    await this.page.waitForSelector("tbody tr", { timeout: 10000 });
    return this.page.locator("tbody tr").count();
  }

  async hasBorrowingsTable(): Promise<boolean> {
    const table = this.page.locator("table");
    return await table.isVisible().catch(() => false);
  }

  async clickReturn(bookTitle: string): Promise<void> {
    // Find the row containing the book title then click its Return button
    const row = this.page.locator("tbody tr").filter({
      has: this.page.locator(`p:text-is("${bookTitle}")`),
    });
    await row.locator('button:text("Return")').click();
  }

  async waitForStatCards(): Promise<void> {
    await this.page.waitForSelector("p.text-3xl", { timeout: 15000 });
  }
}
