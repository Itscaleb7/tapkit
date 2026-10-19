// Full TapKit journey through the real app UI (Expo web build) against the real
// local backend (Supabase + Edge Functions with the mock AI provider).
import { expect, type Page, test } from "@playwright/test";
import { mkdirSync } from "node:fs";

const SHOTS = process.env.E2E_SHOTS ?? "test-results/shots";
mkdirSync(SHOTS, { recursive: true });
const WEB_URL = process.env.WEB_URL ?? "http://localhost:3000";
const FN_URL = process.env.FUNCTIONS_URL ?? "http://127.0.0.1:54500/functions/v1";

const email = `e2e-${Date.now()}@test.tapkit.dev`;
const password = "Journey123";
const slug = `e2e-${Date.now().toString(36)}`;
const PRIVATE_TEXT = "PRIVATE-PROOF-DETAIL coached my first client";
const UNUSED_SECRET = "UNUSED-SECRET-ENTRY never published";

let n = 0;
const shot = (page: Page, name: string) => page.screenshot({ path: `${SHOTS}/${String(++n).padStart(2, "0")}-${name}.png` });
const button = (page: Page, name: string | RegExp) => page.getByRole("button", { name }).first();
const tab = (page: Page, name: string) => page.getByRole("tab", { name }).first();

test.describe.configure({ mode: "serial" });

test("complete TapKit journey", async ({ page, request }) => {
  page.on("dialog", (d) => d.accept());
  page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));
  page.on("console", (m) => m.type() === "error" && console.log("CONSOLE:", m.text().slice(0, 300)));

  // 1. Sign up
  await page.goto("/");
  await expect(page.getByText("Build your personal brand from zero.")).toBeVisible();
  await shot(page, "welcome");
  await button(page, "Get started — it's free").click();
  await page.getByLabel("Your name").fill("Jordan Lee");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await shot(page, "sign-up");
  await button(page, "Create account").click();

  // 2. Onboarding
  await expect(page.getByText("What do you want your personal brand to do for you?")).toBeVisible();
  await page.getByRole("radio", { name: /Attract clients/ }).click();
  await shot(page, "onboarding-goal");
  await button(page, "Continue").click();
  await page.getByRole("radio", { name: /Starting from zero/ }).click();
  await button(page, "Continue").click();
  await page.getByPlaceholder("Add an interest").fill("Strength training");
  await page.getByPlaceholder("Add an interest").press("Enter");
  await button(page, "Continue").click();
  await page.getByPlaceholder("Add a skill").fill("Coaching");
  await page.getByPlaceholder("Add a skill").press("Enter");
  await shot(page, "onboarding-skills");
  // Resume test: reload mid-onboarding and verify progress was saved.
  await button(page, "Continue").click();
  await expect(page.getByText("What have you done so far?")).toBeVisible();
  await page.reload();
  await expect(page.getByText("What have you done so far?")).toBeVisible();
  for (let i = 0; i < 5; i++) await button(page, "Skip").click();
  await expect(page.getByText("Ready when you are")).toBeVisible();
  await shot(page, "onboarding-review");
  await button(page, "Generate my Brand Blueprint").click();

  // 3. Brand Blueprint generated + persisted
  await expect(page.getByText(/I help beginners make steady progress in Strength training/)).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText("From your answers").first()).toBeVisible();
  await expect(page.getByText("Hypothesis to test").first()).toBeVisible();
  await shot(page, "blueprint");
  await button(page, "Accept & use this blueprint").click();

  // Home shows a next action
  await expect(page.getByText("Your next step")).toBeVisible();
  await expect(page.getByText("Capture your first experience")).toBeVisible();
  await shot(page, "home");

  // My Brand reflects the accepted blueprint and is editable
  await page.getByRole("tab", { name: "My Brand" }).click();
  await expect(page.getByText(/steady progress in Strength training/).first()).toBeVisible();
  await expect(page.getByText("Lessons learned").first()).toBeVisible();
  await shot(page, "my-brand");

  // 4. Proof Bank capture
  await page.getByRole("tab", { name: "Home" }).click();
  await button(page, "Capture").click();
  await page.getByLabel("Entry text").fill(`${PRIVATE_TEXT} and learned to simplify programmes.`);
  await shot(page, "capture");
  await button(page, "Save to Proof Bank").click();
  await expect(page.getByText("TapKit's take")).toBeVisible();
  await expect(page.getByText(/\[MOCK\] PRIVATE-PROOF-DETAIL/).first()).toBeVisible({ timeout: 30_000 });
  await shot(page, "proof-entry");

  // A second private entry that is never turned into content (must never appear publicly).
  await page.goto("/proof/new");
  await page.getByLabel("Entry text").fill(UNUSED_SECRET);
  await button(page, "Save to Proof Bank").click();
  await expect(page.getByText("TapKit's take")).toBeVisible();

  // Search finds the first entry
  await page.goto("/home");
  await page.getByRole("tab", { name: "Create" }).click();
  await tab(page, "Proof Bank").click();
  await page.getByLabel("Search Proof Bank").fill("programmes");
  await expect(page.getByText(/PRIVATE-PROOF-DETAIL/).first()).toBeVisible();
  await shot(page, "proof-search");
  await page.getByText(/PRIVATE-PROOF-DETAIL/).first().click();

  // 5. Generate content from the entry
  await button(page, "Turn into content").click();
  await expect(page.getByText("Pick up to 5. TapKit builds the post around your real details.")).toBeVisible();
  await button(page, "Generate with TapKit").click();
  await expect(page.getByRole("img", { name: /Slide 1 of 7/ }).first()).toBeVisible({ timeout: 60_000 });
  await shot(page, "content-detail");

  // 6. Edit the carousel: change heading, add slide, autosave
  await button(page, "Edit slides").click();
  const heading = page.getByRole("textbox").nth(1);
  await expect(heading).toBeVisible();
  await page.getByLabel("Add slide").click();
  await page.getByRole("button", { name: "Checklist" }).first().click();
  await expect(page.getByLabel(/Slide 2, Checklist/)).toBeVisible();
  await expect(page.getByLabel("Saved").filter({ visible: true }).first()).toBeVisible({ timeout: 15_000 });
  await shot(page, "editor");
  await page.goBack();

  // 7. Mark published (requires explicit confirmation)
  await page.getByRole("button", { name: "Published", exact: true }).click();
  await button(page, "I confirm this post is live").click();
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(page.getByText("Record results")).toBeVisible();
  await button(page, "Record results").click();
  await page.getByLabel(/^Reach:/).fill("420");
  await page.getByLabel(/^Likes:/).fill("31");
  await page.getByLabel(/^Saves:/).fill("12");
  await button(page, "Save results").click();
  await expect(page.getByText("Results saved")).toBeVisible();
  await shot(page, "results");

  // 8. Growth experiment
  await page.goto("/insights");
  await expect(page.getByText("Reach by post")).toBeVisible();
  await button(page, "Plan an experiment").click();
  await button(page, "Stories vs tips").click();
  await shot(page, "experiment-new");
  await button(page, "Start experiment").click();
  await expect(page.getByText("What the numbers say")).toBeVisible();
  await shot(page, "experiment");
  await page.goto("/insights");

  // 9. Weekly review from real recorded data
  await button(page, "Review my week").click();
  await expect(page.getByText("Your week")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText("Priorities for next week")).toBeVisible();
  await expect(page.getByText(/\[MOCK\] You created/).filter({ visible: true }).first()).toBeVisible(); // AI review ran on real recorded activity
  await shot(page, "weekly-review");

  // 10. Portfolio: publish and verify the public page + privacy
  await page.goto("/opportunities");
  await button(page, "Set up portfolio").click();
  const address = page.getByRole("textbox").first();
  await expect(address).toBeVisible();
  await address.fill(slug);
  await page.getByRole("button", { name: /^\+ / }).first().click();
  await expect(page.getByText("Published content", { exact: true })).toBeVisible();
  await shot(page, "portfolio-edit");
  await button(page, "Publish").click();
  await expect(button(page, "Unpublish")).toBeVisible();

  const pub = await page.context().newPage();
  await pub.goto(`${WEB_URL}/p/${slug}`);
  await expect(pub.getByRole("heading", { name: "Jordan Lee" })).toBeVisible();
  await expect(pub.getByRole("img", { name: /slide 1/i }).first()).toBeVisible();
  const html = await pub.content();
  expect(html).not.toContain("UNUSED-SECRET-ENTRY"); // private Proof Bank entry
  expect(html).not.toContain(email);
  await pub.screenshot({ path: `${SHOTS}/${String(++n).padStart(2, "0")}-public-portfolio.png`, fullPage: true });
  await pub.close();

  // 11. Pro upgrade encountered on a Pro feature (no purchase is possible on web)
  await page.goto("/brand");
  await button(page, "Explore alternative positioning").click();
  await expect(page.getByText("Build your brand faster")).toBeVisible();
  await expect(page.getByText(/renews automatically/)).toBeVisible();
  await expect(page.getByText("Subscriptions unavailable here")).toBeVisible();
  await shot(page, "paywall");
  await button(page, "Close").click();

  // 12. Subscription verification: the server syncs a (mock) sandbox subscription
  //     exactly as it does after an App Store purchase/restore, and the UI updates.
  const session = await page.evaluate(() => {
    const k = Object.keys(localStorage).find((x) => x.includes("auth-token"));
    return k ? (JSON.parse(localStorage.getItem(k)!) as { access_token: string; user: { id: string } }) : null;
  });
  expect(session).toBeTruthy();
  const token = session!.access_token;
  await request.post(process.env.RC_MOCK_ACTIVATE_URL ?? "http://127.0.0.1:54399/activate", { data: { user_id: session!.user.id } });
  const sync = await request.post(`${FN_URL}/subscription-sync`, { headers: { Authorization: `Bearer ${token}` }, data: {} });
  expect(sync.status()).toBe(200);
  await page.goto("/settings");
  await button(page, "Subscription").click();
  await expect(page.getByText("TapKit Pro").filter({ visible: true }).first()).toBeVisible();
  await expect(page.getByText("Sandbox (test) purchase")).toBeVisible();
  await shot(page, "subscription-pro");
  await page.goto("/settings");

  // 13. Sign out and sign back in — data persists
  await button(page, "Sign out").click();
  await expect(page.getByText("Build your personal brand from zero.")).toBeVisible();
  await button(page, "I already have an account").click();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await button(page, "Sign in").click();
  await expect(page.getByText("Your next step")).toBeVisible();
  await page.goto("/create");
  await expect(page.getByText(/\[MOCK\] PRIVATE-PROOF-DETAIL/).filter({ visible: true }).first()).toBeVisible();
  await shot(page, "after-sign-in");

  // 14. Account deletion removes everything and the portfolio goes offline
  await page.goto("/settings/account");
  await page.getByLabel("Type DELETE to confirm").fill("DELETE");
  await button(page, "Delete my account").click();
  await expect(page.getByText("Build your personal brand from zero.")).toBeVisible({ timeout: 30_000 });
  const gone = await page.context().newPage();
  const res = await gone.goto(`${WEB_URL}/p/${slug}`);
  expect(res?.status()).toBe(404);
  await gone.close();
  await button(page, "I already have an account").click();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await button(page, "Sign in").click();
  await expect(page.getByText("That email and password don't match.")).toBeVisible();
});
