import { test, expect, type Page } from "@playwright/test";

/**
 * End-to-end flows for both roles, run against a real backend in demo mode (in-memory data).
 *
 *   cd backend && SUPABASE_URL=http://dummy.invalid SUPABASE_SERVICE_ROLE_KEY=dummy \
 *     SUPABASE_ANON_KEY=dummy uv run uvicorn main:app --port 8000
 *   cd frontend && npm run build && npx next start -p 3100
 *   E2E_BASE_URL=http://127.0.0.1:3100 npx playwright test
 *
 * Every test fails on an uncaught page error, a console error, or an API error response
 * (>= 400) that the test did not explicitly expect.
 */
const WEB = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";
const API = process.env.E2E_API_URL ?? "http://127.0.0.1:8000";
const RUN = Date.now().toString(36);

test.describe.configure({ mode: "serial" });

function watchForProblems(page: Page, allowedErrors: RegExp[] = []) {
  const problems: string[] = [];
  page.on("pageerror", (e) => problems.push(`page error: ${e.message}`));
  page.on("console", (m) => {
    // The browser also logs every failed request; those are judged by status below.
    if (m.type() === "error" && !m.text().startsWith("Failed to load resource"))
      problems.push(`console error: ${m.text()}`);
  });
  page.on("response", (r) => {
    if (!r.url().startsWith(API)) return;
    const what = `${r.status()} ${r.request().method()} ${r.url().slice(API.length)}`;
    if (r.status() >= 400 && !allowedErrors.some((re) => re.test(what)))
      problems.push(`API error: ${what}`);
  });
  return problems;
}

async function loginWithDemo(page: Page, role: "brand" | "creator", demoLabel: string) {
  await page.goto(`${WEB}/${role}/login`);
  await page.getByRole("button", { name: demoLabel }).click();
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  // creators land in their primary workspace, addressed by its short slug
  await page.waitForURL(role === "brand" ? `${WEB}/brand` : /\/dashboard\/ws-[0-9a-f]{8}$/);
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
  await page
    .locator('input[name="file"]')
    .setInputFiles({ name: "contract.pdf", mimeType: "application/pdf", buffer: pdf });
  await page.getByRole("button", { name: "Upload", exact: true }).click();
  await expect(page.locator("a[href$='/clauses']")).toHaveCount(before + 1, { timeout: 15_000 });
  await page
    .locator("select")
    .filter({ has: page.locator('option[value="signed"]') })
    .first()
    .selectOption("signed");
  await expect(page.getByText(/Couldn't update contract status/)).toHaveCount(0);

  // Clause review for a contract
  await page.locator("a[href$='/clauses']").first().click();
  await page.waitForURL(/\/clauses$/);
  await expectSettled(page);
  // brands see the red-flag scan too, and can switch to the clean contract
  await page.getByRole("button", { name: /Clean Contract View/ }).click();
  await page.getByRole("button", { name: /Flagged Clauses Review/ }).click();

  // Deliverables: create one and move another through a status
  await visit(page, "/deliverables");
  await page.getByRole("button", { name: "+ New deliverable" }).click();
  await page.locator('select[name="deal_id"]').selectOption({ index: 1 });
  await page.locator('input[name="title"]').fill(`E2E Deliverable ${RUN}`);
  await page.locator('input[name="description"]').fill("Reel + 2 stories");
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await expect(page.getByText(`E2E Deliverable ${RUN}`)).toBeVisible();
  await page
    .locator("select")
    .filter({ has: page.locator('option[value="approved"]') })
    .first()
    .selectOption("approved");

  // Payments: raise an invoice and mark one paid
  await visit(page, "/payments");
  await page.getByRole("button", { name: "+ New invoice" }).click();
  await page.locator('select[name="contract_id"]').selectOption({ index: 1 });
  await page.locator('input[name="amount_inr"]').fill("12345");
  await page.locator('input[name="due_date"]').fill("2026-12-31");
  await page.getByRole("button", { name: "Create invoice" }).click();
  await expect(page.getByText(/12,345/).first()).toBeVisible();
  await page
    .locator("select")
    .filter({ has: page.locator('option[value="paid"]') })
    .first()
    .selectOption("paid");

  // Activity log: add a manual note; its text is shown in the list (also after a reload)
  await visit(page, "/activity");
  await page.getByPlaceholder(/Log a manual note/).fill(`E2E note ${RUN}`);
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.getByText(`E2E note ${RUN}`)).toBeVisible();
  await expect(page.getByPlaceholder(/Log a manual note/)).toHaveValue("");
  await visit(page, "/activity");
  await expect(page.getByText(`E2E note ${RUN}`)).toBeVisible();

  // Analytics
  await visit(page, "/analytics");

  // Log out
  await page.getByRole("button", { name: "Log out" }).click();
  await page.waitForURL(`${WEB}/`);

  expect(problems).toEqual([]);
});

test("creator: workspace home, add-content wizard, pipeline board and navigation", async ({
  page,
}) => {
  const problems = watchForProblems(page);
  await loginWithDemo(page, "creator", "1. Ananya Sharma (Mamaearth, Nykaa)");
  const base = new URL(page.url()).pathname;
  await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
  await expectSettled(page);
  const totalCard = page.getByRole("region", { name: "Total Content" });
  const totalBefore = Number(await totalCard.locator("strong").innerText());

  // Add content through the 5-step wizard (Next is blocked until required fields are filled)
  const title = `Morning routine ${RUN}`;
  await page.getByRole("button", { name: "Create", exact: true }).click();
  const wizard = page.getByRole("dialog", { name: "Add New Content Idea" });
  await wizard.getByRole("button", { name: /Reel/ }).click();
  await wizard.getByRole("button", { name: "Next" }).click();
  await expect(wizard.getByRole("button", { name: "Next" })).toBeDisabled();
  await wizard.getByPlaceholder("Enter content title...").fill(title);
  await wizard.getByRole("button", { name: "Next" }).click();
  await expect(wizard.getByRole("button", { name: "Next" })).toBeDisabled();
  await wizard.getByPlaceholder("e.g., Education, Entertainment...").fill("Lifestyle");
  await wizard.getByPlaceholder("Engaging opening line...").fill("I tried 5am for 30 days");
  await wizard.getByRole("button", { name: "Instagram" }).click();
  await wizard.getByRole("button", { name: "Next" }).click();
  await wizard.locator('input[type="date"]').fill("2026-12-01");
  await wizard.getByLabel("Assign To").selectOption({ index: 1 });
  await wizard.getByRole("button", { name: "Next" }).click();
  await expect(wizard.getByText("Review Content Details")).toBeVisible();
  await expect(wizard.getByText("Instagram")).toBeVisible();
  await wizard.getByRole("button", { name: "Save Content" }).click();
  await expect(wizard).toBeHidden();

  // Home reflects it: recent list and the Total Content KPI
  await expect(page.getByText(title)).toBeVisible();
  await expect(totalCard.locator("strong")).toHaveText(String(totalBefore + 1));

  // ⌘K palette finds the item; its quick action opens the wizard on the pipeline
  await page.keyboard.press("ControlOrMeta+k");
  const palette = page.getByRole("dialog", { name: "Search" });
  await palette.getByRole("textbox", { name: "Search" }).fill(RUN);
  await expect(palette.getByRole("option", { name: new RegExp(title) })).toBeVisible();
  await palette.getByRole("textbox", { name: "Search" }).fill("");
  await palette.getByRole("button", { name: /Create New Content/ }).click();
  await page.waitForURL(`${WEB}${base}/kanban`);
  await expect(page.getByRole("dialog", { name: "Add New Content Idea" })).toBeVisible();
  await page.getByRole("button", { name: "Cancel" }).click();

  // Pipeline: drag the card from Idea to Scripted, then use the keyboard-friendly "Move to" menu
  const card = page.locator("article", { hasText: title });
  const column = (name: string) => page.getByRole("region", { name, exact: true });
  await expect(column("Idea").locator("article", { hasText: title })).toBeVisible();
  await card.dragTo(column("Scripted").locator("header")); // the header is always on screen
  await expect(column("Scripted").locator("article", { hasText: title })).toBeVisible();
  await card.getByRole("combobox").selectOption("published");
  await expect(column("Published").locator("article", { hasText: title })).toBeVisible();
  await page.reload();
  await expect(column("Published").locator("article", { hasText: title })).toBeVisible(); // saved

  // Filters: search narrows the board
  await page.getByRole("button", { name: "Filters" }).click();
  await page.getByRole("textbox", { name: "Search content" }).fill(`no-such-title-${RUN}`);
  await expect(page.locator("article", { hasText: title })).toHaveCount(0);
  await page.getByRole("button", { name: "Clear search" }).click();
  await expect(card).toBeVisible();

  // Sidebar navigation, id → slug normalisation, a workspace we can't open
  await page.getByRole("link", { name: "Home" }).first().click();
  await page.waitForURL(`${WEB}${base}`);
  const workspaceId = await page.evaluate(async (api) => {
    const token = JSON.parse(localStorage.getItem("creatoros_session") ?? "{}").access_token;
    const r = await fetch(`${api}/workspaces`, { headers: { Authorization: `Bearer ${token}` } });
    return (await r.json())[0].id as string;
  }, API);
  await page.goto(`${WEB}/dashboard/${workspaceId}`);
  await page.waitForURL(`${WEB}${base}`);
  await page.goto(`${WEB}/dashboard/ws-00000000`);
  await expect(page.getByText(/doesn't exist or you don't have access/)).toBeVisible();

  // The brand app is not for creators
  await page.goto(`${WEB}/chat`);
  await page.waitForURL(/\/dashboard\/ws-/);

  // Sign out from the user menu
  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await page.waitForURL(`${WEB}/creator/login`);

  expect(problems).toEqual([]);
});

test("creator: item editor, scripts with auto-save, AI pages and AI knowledge", async ({
  page,
}) => {
  // The e2e backend has no Gemini key: AI calls answer 503 and the UI must say so and stay usable.
  const problems = watchForProblems(page, [
    /^503 POST \/workspaces\/[^/]+\/ai\/(generate|suggestions\/refresh)$/,
  ]);
  await loginWithDemo(page, "creator", "2. Rohan Mehta (Mamaearth)");
  const base = new URL(page.url()).pathname;
  const title = `Script me ${RUN}`;

  // Wizard: an AI button reports the outage inline; the idea still saves
  await page.getByRole("button", { name: "Create", exact: true }).click();
  const wizard = page.getByRole("dialog", { name: "Add New Content Idea" });
  await wizard.getByRole("button", { name: "Next" }).click();
  await wizard.getByRole("button", { name: "Generate Title" }).click();
  await expect(
    wizard.getByRole("alert").filter({ hasText: /temporarily unavailable/ }),
  ).toBeVisible();
  await wizard.getByPlaceholder("Enter content title...").fill(title);
  await wizard.getByRole("button", { name: "Next" }).click();
  await wizard.getByPlaceholder("e.g., Education, Entertainment...").fill("Edu");
  await wizard.getByPlaceholder("Engaging opening line...").fill("Hook line");
  for (let i = 0; i < 2; i++) await wizard.getByRole("button", { name: "Next" }).click();
  await wizard.getByRole("button", { name: "Save Content" }).click();
  await expect(wizard).toBeHidden();

  // Board: open the card, edit it, jump to its script
  await page.getByRole("link", { name: "Content", exact: true }).click();
  await page.getByRole("button", { name: title }).click();
  const editor = page.getByRole("dialog", { name: "Edit content" });
  await editor.getByLabel("Content Pillar").fill("Education");
  await editor.getByRole("button", { name: "Save changes" }).click();
  await expect(editor).toBeHidden();
  await expect(page.locator("article", { hasText: title })).toContainText("Education");
  await page.getByRole("button", { name: title }).click();
  await page.getByRole("link", { name: "Open script" }).click();
  await page.waitForURL(`${WEB}${base}/scripts`);

  // Scripts: auto-save, survives a reload, moves the idea to Scripted
  const script = page.getByRole("textbox", { name: "Script" });
  await script.fill(`Intro for ${RUN}`);
  await expect(page.getByRole("status")).toHaveText(/Saved/);
  await page.getByRole("button", { name: "Generate outline" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: /temporarily unavailable/ }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: new RegExp(title) }).click();
  await expect(script).toHaveValue(`Intro for ${RUN}`);
  await expect(page.getByRole("button", { name: new RegExp(title) })).toContainText("Scripted");

  // AI Assistant: empty state, generating reports the outage
  await page.getByRole("link", { name: "AI Assistant", exact: true }).click();
  await expect(page.getByText(/No suggestions yet|All suggestions dismissed/)).toBeVisible();
  await page.getByRole("button", { name: "Generate New Suggestions" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: /temporarily unavailable/ }),
  ).toBeVisible();

  // Settings › AI knowledge persists
  await page.getByRole("link", { name: "Configure Knowledge" }).click();
  await page.waitForURL(`${WEB}${base}/settings/ai-knowledge`);
  await page.getByLabel("Brand").fill(`Budget travel ${RUN}`);
  await page.getByRole("button", { name: "Save knowledge" }).click();
  await expect(page.getByRole("status")).toHaveText("Saved");
  await page.reload();
  await expect(page.getByLabel("Brand")).toHaveValue(`Budget travel ${RUN}`);

  expect(problems).toEqual([]);
});

test("creator: calendar scheduling and approvals", async ({ page }) => {
  const problems = watchForProblems(page);
  await loginWithDemo(page, "creator", "3. Zara Khan (Nykaa)");
  const base = new URL(page.url()).pathname;
  const title = `Calendar ${RUN}`;
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const todayIso = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const todayLabel = now.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // Calendar: month view, click today's cell → wizard with today's due date
  await page.getByRole("link", { name: "Calendar", exact: true }).click();
  await page.waitForURL(`${WEB}${base}/schedule`);
  await page.getByRole("button", { name: "Month" }).click();
  await page.getByRole("button", { name: `Add content for ${todayLabel}` }).click();
  const wizard = page.getByRole("dialog", { name: "Add New Content Idea" });
  await wizard.getByRole("button", { name: "Next" }).click();
  await wizard.getByPlaceholder("Enter content title...").fill(title);
  await wizard.getByRole("button", { name: "Next" }).click();
  await wizard.getByPlaceholder("e.g., Education, Entertainment...").fill("Beauty");
  await wizard.getByPlaceholder("Engaging opening line...").fill("Hook");
  await wizard.getByRole("button", { name: "YouTube" }).click();
  await wizard.getByRole("button", { name: "Next" }).click();
  await expect(wizard.locator('input[type="date"]')).toHaveValue(todayIso);
  await wizard.getByRole("button", { name: "Next" }).click();
  await wizard.getByRole("button", { name: "Save Content" }).click();
  await expect(wizard).toBeHidden();
  const dueChip = page.getByRole("button", { name: `Due · ${title}` });
  await expect(dueChip).toBeVisible();

  // Schedule it from the chip's editor; it shows in the feed as Scheduled
  await dueChip.click();
  const editor = page.getByRole("dialog", { name: "Edit content" });
  await editor.getByLabel("Scheduled for").fill(`${todayIso}T18:30`);
  await editor.getByRole("button", { name: "Save changes" }).click();
  await expect(editor).toBeHidden();
  const feed = page.getByRole("region", { name: "Feed" });
  await expect(feed.locator("li", { hasText: title })).toContainText("Scheduled");

  // Request approval, reject with a reason, request again, approve → Published
  await dueChip.click();
  await editor.getByRole("button", { name: "Request approval" }).click();
  await expect(editor.getByText(/Sent for approval/)).toBeVisible();
  await editor.getByRole("button", { name: "Close" }).click();
  await page.getByRole("link", { name: "Approvals", exact: true }).click();
  await page.getByRole("button", { name: `Reject ${title}` }).click();
  const rejectDialog = page.getByRole("dialog", { name: "Reject publish" });
  await expect(rejectDialog.getByRole("button", { name: "Reject" })).toBeDisabled();
  await rejectDialog.locator("textarea").fill("Fix the thumbnail");
  await rejectDialog.getByRole("button", { name: "Reject" }).click();
  const decisions = page.getByRole("region", { name: "Recent decisions" });
  await expect(decisions.locator("li", { hasText: title })).toContainText("Fix the thumbnail");
  await expect(page.getByText("Nothing waiting")).toBeVisible();

  await page.getByRole("link", { name: "Calendar", exact: true }).click();
  await page.getByRole("button", { name: `Due · ${title}` }).click();
  await editor.getByRole("button", { name: "Request approval" }).click();
  await expect(editor.getByText(/Sent for approval/)).toBeVisible();
  await editor.getByRole("button", { name: "Close" }).click();
  await page.getByRole("link", { name: "Approvals", exact: true }).click();
  await page.getByRole("button", { name: `Approve ${title}` }).click();
  await expect(decisions.locator("li", { hasText: title }).first()).toContainText("Approved");

  await page.getByRole("link", { name: "Content", exact: true }).click();
  await expect(
    page
      .getByRole("region", { name: "Published", exact: true })
      .locator("article", { hasText: title }),
  ).toBeVisible();

  expect(problems).toEqual([]);
});

test("creator: brand CRM deals, linked content and deal association", async ({ page }) => {
  const problems = watchForProblems(page);
  await loginWithDemo(page, "creator", "1. Ananya Sharma (Mamaearth, Nykaa)");
  const company = `Lakme ${RUN}`;

  await page.getByRole("link", { name: "Brand CRM", exact: true }).click();
  // brand deals made on Creator OS show read-only
  await expect(
    page.getByRole("region", { name: "On Creator OS" }).locator("li").first(),
  ).toBeVisible();

  // New Deal wizard (4 steps) with a linked content item
  await page.getByRole("button", { name: "New Deal" }).click();
  const wizard = page.getByRole("dialog", { name: "Create New Deal" });
  await wizard.getByPlaceholder("Enter company name").fill(company);
  await wizard.getByPlaceholder("e.g., Jane Doe").fill("Priya");
  await wizard.getByRole("button", { name: "Next" }).click();
  await wizard.getByLabel("Deal Size").fill("25000");
  await wizard.getByLabel("Status").selectOption("negotiating");
  await wizard.getByLabel("Priority").selectOption("high");
  await wizard.getByRole("button", { name: "Next" }).click();
  await wizard.getByPlaceholder("Add a tag").fill("reel");
  await wizard.getByRole("button", { name: "Add", exact: true }).click();
  await wizard.getByRole("button", { name: "Next" }).click();
  await wizard.getByLabel("Create a content item for this deal").check();
  await wizard.getByPlaceholder("Engaging opening line...").fill("You won't believe this shade");
  await wizard.getByRole("button", { name: "Finish & Save Deal" }).click();
  await expect(wizard).toBeHidden();
  const row = page.locator("tbody tr", { hasText: company });
  await expect(row).toContainText("Negotiating");
  await expect(row).toContainText("25,000");

  // Filters and sorting
  await page.getByRole("button", { name: "Filter", exact: true }).click();
  await page.getByRole("group", { name: "Status" }).getByRole("button", { name: "Paid" }).click();
  await expect(row).toHaveCount(0);
  await page.getByRole("button", { name: "Clear All" }).click();
  await expect(row).toBeVisible();
  await page.getByRole("button", { name: "Sort by Value" }).click();

  // Edit → Paid
  await page.getByRole("button", { name: `Edit ${company}` }).click();
  const edit = page.getByRole("dialog", { name: "Edit Deal" });
  await edit.getByRole("button", { name: "Next" }).click();
  await edit.getByLabel("Status").selectOption("paid");
  for (let i = 0; i < 2; i++) await edit.getByRole("button", { name: "Next" }).click();
  await edit.getByRole("button", { name: "Save Deal" }).click();
  await expect(row).toContainText("Paid");

  // The linked content item is on the board; new content can be associated with the deal
  await page.getByRole("link", { name: "Content", exact: true }).click();
  await expect(
    page.locator("article", { hasText: `${company} — sponsored content` }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Add Content" }).click();
  const add = page.getByRole("dialog", { name: "Add New Content Idea" });
  await add.getByRole("button", { name: "Next" }).click();
  await add.getByPlaceholder("Enter content title...").fill(`Deal follow-up ${RUN}`);
  await add.getByRole("button", { name: "Next" }).click();
  await add.getByPlaceholder("e.g., Education, Entertainment...").fill("Beauty");
  await add.getByPlaceholder("Engaging opening line...").fill("Hook");
  await add.getByRole("button", { name: "Next" }).click();
  await add.getByPlaceholder("Search for a deal (company - contact)...").fill(RUN);
  await add.getByLabel("Deal", { exact: true }).selectOption({ label: `${company} - Priya` });
  await add.getByRole("button", { name: "Next" }).click();
  await expect(add.locator("dd", { hasText: company })).toBeVisible();
  await add.getByRole("button", { name: "Save Content" }).click();
  await expect(add).toBeHidden();

  // Delete the deal (linked content stays)
  await page.getByRole("link", { name: "Brand CRM", exact: true }).click();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: `Delete ${company}` }).click();
  await expect(row).toHaveCount(0);

  expect(problems).toEqual([]);
});

test("creator: contracts with the red-flag clause review in the workspace", async ({ page }) => {
  const problems = watchForProblems(page);
  await loginWithDemo(page, "creator", "1. Ananya Sharma (Mamaearth, Nykaa)");
  const base = new URL(page.url()).pathname;
  await page.getByRole("link", { name: "Contracts", exact: true }).click();
  await page.waitForURL(`${WEB}${base}/contracts`);
  await expectSettled(page);
  await page.getByRole("link", { name: "Review clauses" }).first().click();
  await page.waitForURL(new RegExp(`${base}/contracts/[0-9a-f-]{36}$`));
  await expectSettled(page);
  await page.getByRole("button", { name: /Clean Contract View/ }).click();
  await page.getByRole("button", { name: /Flagged Clauses Review/ }).click();
  await expect(page.getByRole("link", { name: "Contracts", exact: true })).toHaveAttribute(
    "class",
    /on/,
  );
  await page.getByRole("link", { name: /Back to contracts/ }).click();
  await page.waitForURL(`${WEB}${base}/contracts`);
  expect(problems).toEqual([]);
});

test("team: invite a script writer, permissions shape their workspace, owner sees the audit log", async ({
  browser,
}) => {
  const ownerPage = await (await browser.newContext()).newPage();
  const ownerProblems = watchForProblems(ownerPage);
  await loginWithDemo(ownerPage, "creator", "2. Rohan Mehta (Mamaearth)");
  const base = new URL(ownerPage.url()).pathname;

  // Owner invites the script writer (demo mode never emails: the link is shown to copy)
  await ownerPage.getByRole("link", { name: "Settings", exact: true }).click();
  await ownerPage.waitForURL(`${WEB}${base}/settings/workspace`);
  await ownerPage.getByRole("tab", { name: "Members" }).click();
  await ownerPage.getByPlaceholder("colleague@company.com").fill("demo.creator5@creatoros.dev");
  await ownerPage.getByRole("combobox").first().selectOption("script_writer");
  await ownerPage.getByRole("button", { name: "Send invite" }).click();
  const link = await ownerPage.locator("code", { hasText: "/invite/" }).innerText();

  // The invitee signs in, opens the link and joins
  const writerPage = await (await browser.newContext()).newPage();
  const writerProblems = watchForProblems(writerPage);
  await writerPage.goto(link);
  await writerPage.getByRole("link", { name: "Sign in" }).click();
  await writerPage.getByRole("button", { name: "5. Ishita Rao (boAt)" }).click();
  await writerPage.getByRole("button", { name: "Sign in", exact: true }).click();
  await writerPage.waitForURL(/\/invite\//); // the pending invite brings them back
  await expect(writerPage.getByRole("heading", { name: /Join / })).toBeVisible();
  await writerPage.getByRole("button", { name: "Accept invitation" }).click();
  await writerPage.waitForURL(`${WEB}${base}`);

  // The sidebar only shows what a script writer may open; the API refuses the rest
  const sidebar = writerPage.getByRole("complementary", { name: "Sidebar" });
  await expect(sidebar.getByRole("link", { name: "Scripts" })).toBeVisible();
  for (const hidden of ["Brand CRM", "AI Assistant", "Contracts", "Settings"])
    await expect(sidebar.getByRole("link", { name: hidden, exact: true })).toHaveCount(0);
  await writerPage.goto(`${WEB}${base}/crm`);
  await expect(writerPage.getByText("You don't have access to this page")).toBeVisible();

  // Owner: seats and audit log reflect it; then removes the member
  await ownerPage.getByRole("tab", { name: "Roles" }).click();
  await expect(ownerPage.getByText("1 of 2 used").first()).toBeVisible();
  await ownerPage.getByRole("tab", { name: "Audit log" }).click();
  await expect(ownerPage.getByRole("cell", { name: /Joined the workspace/ }).first()).toBeVisible();
  await ownerPage.getByRole("tab", { name: "Members" }).click();
  ownerPage.once("dialog", (d) => d.accept());
  await ownerPage.getByRole("button", { name: /Remove Ishita/ }).click();
  await expect(ownerPage.getByText(/was removed/)).toBeVisible();

  expect(ownerProblems).toEqual([]);
  expect(writerProblems).toEqual([]);
});

test("unknown URLs show the 404 page", async ({ page }) => {
  await page.goto(`${WEB}/no-such-page-${RUN}`);
  await expect(page.getByRole("heading", { name: "We can't find that page" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Go to dashboard" })).toBeVisible();
});
