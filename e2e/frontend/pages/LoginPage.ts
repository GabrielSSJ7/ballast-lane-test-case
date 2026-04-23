import { Page } from "@playwright/test";

export class LoginPage {
  constructor(private page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto("/login");
  }

  async fillEmail(email: string): Promise<void> {
    // Input id is auto-generated from label: "email"
    await this.page.fill("#email", email);
  }

  async fillPassword(password: string): Promise<void> {
    // Input id is auto-generated from label: "password"
    await this.page.fill("#password", password);
  }

  async submit(): Promise<void> {
    await this.page.click('button[type="submit"]');
  }

  async login(email: string, password: string): Promise<void> {
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.submit();
  }

  async getErrorText(): Promise<string | null> {
    try {
      await this.page.waitForSelector("p.text-red-600", { timeout: 5000 });
    } catch {
      return null;
    }
    return this.page.locator("p.text-red-600").first().textContent();
  }

  async waitForRedirect(): Promise<void> {
    await this.page.waitForURL(/\/(dashboard|books)/, { timeout: 10000 });
  }
}
