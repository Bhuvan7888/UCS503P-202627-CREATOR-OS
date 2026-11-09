import { test, expect, type Page } from "@playwright/test";

/**
 * End-to-end flows for both roles, run against a real backend in demo mode (in-memory data).
 *
 *   cd backend && SUPABASE_URL=http://dummy.invalid SUPABASE_SERVICE_ROLE_KEY=dummy \
 *     SUPABASE_ANON_KEY=dummy uv run uvicorn main:app --port 8000
 *   cd frontend && npm run build && npx next start -p 3100
 *   E2E_BASE_URL=http://127.0.0.1:3100 npx playwright test
 *
 * Every test fails on an uncaught page error, a console error, or an API response >= 500
 * (and on any 4xx that the test did not explicitly expect).
 */
const WEB = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";
const API = process.env.E2E_API_URL ?? "http://127.0.0.1:8000";
const RUN = Date.now().toString(36);

test.describe.configure({ mode: "serial" });

function watchForProblems(page: Page, allowed4xx: RegExp[] = []) {
  const problems: string[] = [];
  page.on("pageerror", (e) => problems.push(`page error: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error") problems.push(`console error: ${m.text()}`);
  });
  page.on("response", (r) => {
    if (!r.url().startsWith(API)) return;
    const what = `${r.status()} ${r.request().method()} ${r.url().slice(API.length)}`;
    if (r.status() >= 500) problems.push(`server error: ${what}`);
    else if (r.status() >= 400 && !allowed4xx.some((re) => re.test(what))) problems.push(`client error: ${what}`);
  });
  return problems;
}

async function loginWithDemo(page: Page, role: "brand" | "creator", demoLabel: string) {
  await page.goto(`${WEB}/${role}/login`);
  await page.getByRole("button", { name: demoLabel }).click();
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL(`${WEB}/${role}`);
}

async function expectSettled(page: Page) {
  // Pages render "Loading…" until their data arrives; it must go away, and no load error may show.
  await expect(page.getByText("Loading…")).toHaveCount(0, { timeout: 15_000 });
  await expect(page.getByText(/Couldn't load/)).toHaveCount(0);
}

async function visit(page: Page, path: string) {
  await page.goto(WEB + path);
  await expectSettled(page);
}

test("landing page links to both roles", async ({ page }) => {
  const problems = watchForProblems(page);
  await visit(page, "/");
  await expect(page.locator('a[href="/brand/login"]').first()).toBeVisible({ visible: false });
  await expect(page.locator('a[href="/creator/signup"]').first()).toBeAttached();
  expect(problems).toEqual([]);
});

test("brand: every page loads and every main action works", async ({ page }) => {
  const problems = watchForProblems(page);
  await loginWithDemo(page, "brand", "1. Mamaearth");
  await expectSettled(page);

  // Deals: create a deal for an existing creator
  await page.getByRole("button", { name: "+ New deal" }).click();
  await page.locator('select[name="creator_id"]').selectOption({ index: 1 });
  await page.locator('input[name="campaign_name"]').fill(`E2E Campaign ${RUN}`);
  await page.locator('input[name="contact_email"]').fill("e2e@example.com");
  await page.getByRole("button", { name: "Create deal" }).click();
  await expect(page.getByText(`E2E Campaign ${RUN}`)).toBeVisible();

  // Creators: onboard a creator
  await page.getByRole("button", { name: "+ Onboard creator" }).click();
  await page.locator('input[name="display_name"]').fill(`E2E Creator ${RUN}`);
  await page.locator('input[name="instagram_handle"]').fill(`@e2e_${RUN}`);
  await page.locator('input[name="niche"]').fill("beauty");
  await page.locator('select[name="follower_tier"]').selectOption("micro");
  await page.getByRole("button", { name: "Onboard", exact: true }).click();
  await expect(page.getByText(`E2E Creator ${RUN}`).first()).toBeVisible();

  // Deal detail: open a deal and add a deliverable from there
  await page.locator("a[href^='/deals/']").first().click();
  await page.waitForURL(/\/deals\//);
  await expectSettled(page);
  await page.locator('input[name="title"]').fill(`Deal-page deliverable ${RUN}`);
  await page.locator('input[name="description"]').fill("Created from the deal page");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.getByText(`Deal-page deliverable ${RUN}`)).toBeVisible();

  // Chat: send a message
  await visit(page, "/chat");
  await page.getByRole("button", { name: "Ananya Sharma" }).click();
  await page.getByPlaceholder("Message…").fill(`Hello from E2E ${RUN}`);
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByText(`Hello from E2E ${RUN}`)).toBeVisible();

  // Contracts: upload the sample PDF against a deal, then change a contract's status
  await visit(page, "/contracts");
  const pdf = await (await page.request.get(`${API}/contracts/sample-contract-pdf`)).body();
  const before = await page.locator("a[href$='/clauses']").count();
  await page.getByRole("button", { name: "+ Upload contract" }).click();
  await page.locator('select[name="deal_id"]').selectOption({ index: 2 });
  await page.locator('input[name="file"]').setInputFiles({ name: "contract.pdf", mimeType: "application/pdf", buffer: pdf });
  await page.getByRole("button", { name: "Upload", exact: true }).click();
  await expect(page.locator("a[href$='/clauses']")).toHaveCount(before + 1, { timeout: 15_000 });
  await page.locator("select").filter({ has: page.locator('option[value="signed"]') }).first().selectOption("signed");
  await expect(page.getByText(/Couldn't update contract status/)).toHaveCount(0);

  // Clause review for a contract
  await page.locator("a[href$='/clauses']").first().click();
  await page.waitForURL(/\/clauses$/);
  await expectSettled(page);

  // Deliverables: create one and move another through a status
  await visit(page, "/deliverables");
  await page.getByRole("button", { name: "+ New deliverable" }).click();
  await page.locator('select[name="deal_id"]').selectOption({ index: 1 });
  await page.locator('input[name="title"]').fill(`E2E Deliverable ${RUN}`);
  await page.locator('input[name="description"]').fill("Reel + 2 stories");
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await expect(page.getByText(`E2E Deliverable ${RUN}`)).toBeVisible();
  await page.locator("select").filter({ has: page.locator('option[value="approved"]') }).first().selectOption("approved");

  // Payments: raise an invoice and mark one paid
  await visit(page, "/payments");
  await page.getByRole("button", { name: "+ New invoice" }).click();
  await page.locator('select[name="contract_id"]').selectOption({ index: 1 });
  await page.locator('input[name="amount_inr"]').fill("12345");
  await page.locator('input[name="due_date"]').fill("2026-12-31");
  await page.getByRole("button", { name: "Create invoice" }).click();
  await expect(page.getByText(/12,345/).first()).toBeVisible();
  await page.locator("select").filter({ has: page.locator('option[value="paid"]') }).first().selectOption("paid");

  // Activity log: add a manual note
  await visit(page, "/activity");
  await page.getByPlaceholder(/Log a manual note/).fill(`E2E note ${RUN}`);
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.getByText(`E2E note ${RUN}`)).toBeVisible();

  // Analytics
  await visit(page, "/analytics");

  // Log out
  await page.getByRole("button", { name: "Log out" }).click();
  await page.waitForURL(`${WEB}/`);

  expect(problems).toEqual([]);
});

test("creator: every page loads and every main action works", async ({ page }) => {
  // The negotiation AI needs a real Gemini key; in demo mode the backend answers with an error,
  // which the page must show without breaking.
  const problems = watchForProblems(page, [/POST \/negotiation\/sessions\/[^/]+\/conversations$/]);
  await loginWithDemo(page, "creator", "1. Ananya Sharma (Mamaearth, Nykaa)");
  await expectSettled(page);

  // Dashboard: log a growth snapshot and add a deal with a linked brand
  await page.locator('input[name="recorded_at"]').fill("2026-11-01");
  await page.locator('input[name="followers_count"]').fill("70000");
  await page.getByRole("button", { name: "Log", exact: true }).click();
  await page.getByRole("button", { name: "+ Add a deal" }).click();
  await page.locator('select[name="brand_id"]').selectOption({ index: 1 });
  await page.locator('input[name="campaign_name"]').fill(`Creator Deal ${RUN}`);
  await page.locator('input[name="contact_email"]').fill("brand@example.com");
  await page.getByRole("button", { name: "Add deal" }).click();
  await expect(page.getByText(`Creator Deal ${RUN}`).first()).toBeVisible();

  // Negotiation workspace from the deals table
  await page.locator("tbody tr").first().click();
  await page.waitForURL(/\/creator\/negotiate\//);
  await expectSettled(page);
  await expect(page.getByText("SUGGESTED RANGE", { exact: false })).toBeVisible();
  await page.locator("textarea").fill("They offered ₹15,000 for one reel.");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.locator("textarea")).toBeEnabled({ timeout: 15_000 });

  // Board
  await visit(page, "/creator/board");
  await expect(page.getByText(`Creator Deal ${RUN}`).first()).toBeVisible();

  // Contracts: one-click sample scan, then open the flagged-clause review
  await visit(page, "/contracts");
  const before = await page.locator("a[href$='/clauses']").count();
  await page.getByRole("button", { name: /Test sample contract/ }).click();
  await expect(page.locator("a[href$='/clauses']")).toHaveCount(before + 1, { timeout: 15_000 });
  await page.locator("a[href$='/clauses']").first().click();
  await page.waitForURL(/\/clauses$/);
  await expectSettled(page);
  await page.getByRole("button", { name: /Clean Contract View/ }).click();
  await page.getByRole("button", { name: /Flagged Clauses Review/ }).click();

  // Deliverables: creator moves one forward
  await visit(page, "/deliverables");
  await page.locator("select").filter({ has: page.locator('option[value="submitted"]') }).first().selectOption("submitted");

  // Payments and chat
  await visit(page, "/payments");
  await visit(page, "/chat");
  await page.getByRole("button", { name: "Mamaearth" }).click();
  await page.getByPlaceholder("Message…").fill(`Hi from creator ${RUN}`);
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByText(`Hi from creator ${RUN}`)).toBeVisible();

  expect(problems).toEqual([]);
});
