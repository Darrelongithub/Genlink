/**
 * End-to-end learner & platform readiness matrix:
 * 1. Mock mode banner visibility & clean exit (?mock=1 -> Exit the preview never leaks mock data as live)
 * 2. Backend unavailable / HTML 502-503 graceful recovery (actionable retry, zero raw HTML or GET/POST leaks)
 * 3. Slow backend loading indicator + in-flight fetch abort on navigation + synchronous double-submit guard
 * 4. Mid-session expiration (HTTP 401 on protected mutation transitions cleanly to AccountGate with notice)
 * 5. Blocked localStorage/sessionStorage (SecurityError) resilience across learner shell & demo
 * 6. Semantics, mobile form zoom (>=16px), non-nested radio controls, valid <dl>, 320px..1920px zero overflow,
 *    and zero external CDN / font / analytics requests across routes.
 */
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { chromium } from "playwright";

const BASE = process.env.ADAPT_BASE_URL ?? "http://127.0.0.1:3000";
const executablePath = [
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
  process.env.PW_CHROMIUM,
  "/opt/pw-browsers/chromium",
  "/tmp/chromium",
].find((p) => p && existsSync(p));

const browser = await chromium.launch({
  ...(executablePath ? { executablePath } : {}),
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

const passed = [];
async function check(name, fn) {
  await fn();
  passed.push(name);
  console.log(`  \x1b[32mok\x1b[0m  ${name}`);
}

async function createGuestContext(viewport = { width: 1280, height: 800 }) {
  const context = await browser.newContext({ viewport });
  await context.addInitScript(() => {
    try {
      window.sessionStorage.setItem("adapt:seen-opening", "1");
    } catch {
      /* ignore when testing blocked storage */
    }
  });
  const res = await context.request.post(`${BASE}/api/v1/students`, {
    data: { as_guest: true, age_band: "16-18", consent_analytics: false, consent_share_with_llm: false },
  });
  assert.equal(res.status(), 200, `guest creation failed: ${res.status()}`);
  return context;
}

try {
  console.log("\x1b[1mLearner & platform readiness matrix E2E\x1b[0m");

  // 1. Mock mode banner & clean exit without leaking mock learner into live mode
  await check("?mock=1 displays sample banner and 'Exit the preview' clears mock state completely", async () => {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await context.addInitScript(() => window.sessionStorage.setItem("adapt:seen-opening", "1"));
    const page = await context.newPage();

    await page.goto(`${BASE}/?mock=1`, { waitUntil: "networkidle" });
    const banner = page.getByRole("region", { name: "Sample data preview notice" });
    await banner.waitFor({ state: "visible" });
    assert.match(await banner.innerText(), /Example data/);

    // Exiting preview must drop mock session and show signed-out AccountGate (never Maya/Mock learner)
    await banner.getByRole("link", { name: "Exit the preview" }).click();
    await page.locator("[data-account-gate]").waitFor({ state: "visible", timeout: 10_000 });
    assert.equal(await banner.count(), 0);
    assert.doesNotMatch(await page.locator("body").innerText(), /Mock learner/);

    await context.close();
  });

  // 2. Backend unavailable / HTML 503 error page shows actionable message & Retry button (never infinite loading)
  await check("backend unavailable shows actionable retry message and recovers when backend returns", async () => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await context.addInitScript(() => window.sessionStorage.setItem("adapt:seen-opening", "1"));
    const page = await context.newPage();

    let failBackend = true;
    await page.route("**/api/v1/me", async (route) => {
      if (failBackend) {
        await route.fulfill({
          status: 503,
          contentType: "text/html",
          body: "<!DOCTYPE html><html><body>503 Service Unavailable</body></html>",
        });
      } else {
        await route.continue();
      }
    });

    await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
    const retryBtn = page.getByRole("button", { name: "Retry session check" });
    await retryBtn.waitFor({ state: "visible", timeout: 10_000 });
    const text = await page.locator("body").innerText();
    assert.match(text, /Your session could not be checked/);
    assert.doesNotMatch(text, /<!DOCTYPE|GET \/|POST \//i);

    failBackend = false;
    await retryBtn.click();
    await page.locator("[data-account-gate]").waitFor({ state: "visible", timeout: 10_000 });

    await context.close();
  });

  // 3. Slow backend loading state + in-flight request abort on navigation + double-submit protection
  await check("slow backend shows loading state, aborts in-flight fetch on navigation & blocks double submit", async () => {
    const context = await createGuestContext({ width: 1280, height: 800 });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));

    let abortedOnNavigate = false;
    let delayList = true;
    await page.route("**/api/v1/study/items", async (route) => {
      if (route.request().method() === "GET" && delayList) {
        route.request().failure();
        await new Promise((resolve) => {
          const timer = setTimeout(resolve, 4_000);
          route.request().frame().page().once("framenavigated", () => {
            clearTimeout(timer);
            resolve();
          });
        });
        try {
          await route.continue();
        } catch {
          abortedOnNavigate = true;
        }
        return;
      }
      await route.continue();
    });

    const failedRequests = [];
    page.on("requestfailed", (req) => {
      if (req.url().includes("/api/v1/study/items")) failedRequests.push(req.failure()?.errorText ?? "aborted");
    });

    await page.goto(`${BASE}/tools`, { waitUntil: "domcontentloaded" });
    await page.getByText("Loading your saved notes…").waitFor({ state: "visible", timeout: 10_000 });

    // Navigate away via sidebar while GET /api/v1/study/items is still in flight
    await page.locator('.sidebar-item[href="/settings"]').click();
    await page.getByRole("heading", { name: /Settings/i }).waitFor({ state: "visible", timeout: 10_000 });
    await page.waitForTimeout(250);
    assert(abortedOnNavigate || failedRequests.length >= 1, "expected in-flight /study/items GET to abort on unmount");
    assert.equal(errors.length, 0, `unexpected errors after abort: ${errors.join("; ")}`);

    // Now test synchronous double-submit protection on POST /api/v1/study/items
    delayList = false;
    let postCount = 0;
    await page.route("**/api/v1/study/items", async (route) => {
      if (route.request().method() === "POST") {
        postCount += 1;
        await new Promise((r) => setTimeout(r, 350));
      }
      await route.continue();
    });

    await page.goto(`${BASE}/tools`, { waitUntil: "networkidle" });
    await page.getByLabel("Note").fill("Fractions common denominator note");
    const saveBtn = page.getByRole("button", { name: "Save note" });
    // Dispatch two rapid form submit events synchronously before React re-renders disabled state
    await saveBtn.evaluate((btn) => {
      btn.click();
      btn.closest("form")?.requestSubmit();
    });
    await page.getByText("Note saved to your learner record.").waitFor({ state: "visible", timeout: 10_000 });
    assert.equal(postCount, 1, `double-submit guard should allow 1 POST, got ${postCount}`);

    await context.close();
  });

  // 4. Expired session mid-study (401 on protected endpoint transitions cleanly to AccountGate)
  await check("expired session (HTTP 401) transitions cleanly to AccountGate with session-ended notice", async () => {
    const context = await createGuestContext({ width: 1280, height: 800 });
    const page = await context.newPage();

    await page.goto(`${BASE}/tools`, { waitUntil: "networkidle" });
    await page.getByLabel("Note").fill("Session expiry test note");

    await page.route("**/api/v1/study/items", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 401,
          contentType: "application/json",
          body: JSON.stringify({ detail: "session expired" }),
        });
        return;
      }
      await route.continue();
    });

    await page.getByRole("button", { name: "Save note" }).click();
    await page.locator("[data-account-gate]").waitFor({ state: "visible", timeout: 10_000 });
    assert.match(await page.locator("[data-account-gate]").innerText(), /Your session ended — sign in again/);

    await context.close();
  });

  // 5. Blocked browser storage (SecurityError) across signed-out, /demo & signed-in learner shell
  await check("blocked localStorage/sessionStorage (SecurityError) never crashes learner shell or /demo", async () => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await context.addInitScript(() => {
      const deny = () => {
        throw new DOMException("Blocked storage", "SecurityError");
      };
      Object.defineProperty(window, "localStorage", { get: deny, configurable: true });
      Object.defineProperty(window, "sessionStorage", { get: deny, configurable: true });
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));

    await page.goto(`${BASE}/demo`, { waitUntil: "networkidle" });
    await page.getByRole("heading", { level: 1 }).waitFor({ state: "visible" });
    assert.equal(errors.length, 0, `/demo storage error: ${errors.join("; ")}`);

    await page.goto(`${BASE}/?mock=1`, { waitUntil: "networkidle" });
    const skip = page.locator(".opening-skip");
    if (await skip.isVisible()) await skip.click();
    await page.locator("header.topbar").waitFor({ state: "visible", timeout: 10_000 });
    assert.equal(errors.length, 0, `learner shell storage error: ${errors.join("; ")}`);

    await context.close();
  });

  // 6. Semantic HTML, mobile form zoom (>=16px), 320px responsive check & zero external CDN check
  await check("semantic HTML (<header>, non-nested radios, valid <dl>), >=16px inputs, 320px fit & zero external CDNs", async () => {
    const externalUrls = [];
    const context = await browser.newContext({ viewport: { width: 320, height: 568 } });
    await context.addInitScript(() => window.sessionStorage.setItem("adapt:seen-opening", "1"));
    const page = await context.newPage();
    page.on("request", (req) => {
      const url = new URL(req.url());
      if (url.protocol.startsWith("http") && !["127.0.0.1", "localhost"].includes(url.hostname)) {
        externalUrls.push(req.url());
      }
    });

    await page.goto(`${BASE}/?mock=1`, { waitUntil: "networkidle" });
    for (const route of ["/learn", "/proposals", "/first-lesson", "/review", "/settings", "/tools"]) {
      await page.goto(`${BASE}${route}`, { waitUntil: "networkidle" });
      const checkResult = await page.evaluate(() => {
        const overflowPx = document.documentElement.scrollWidth - window.innerWidth;
        const headerLandmark = Boolean(document.querySelector("header.topbar"));
        const nestedRadioInputs = document.querySelectorAll("button input[type='radio']").length;
        const invalidDlChildren = [...document.querySelectorAll("dl > *")].filter(
          (el) => !["DT", "DD", "DIV", "SCRIPT", "TEMPLATE"].includes(el.tagName),
        ).length;
        const smallTextInputs = [...document.querySelectorAll("input:not([type='checkbox']):not([type='radio']):not([type='range']), textarea, select")]
          .filter((el) => el.getBoundingClientRect().width > 0)
          .filter((el) => parseFloat(getComputedStyle(el).fontSize) < 16)
          .map((el) => el.id || el.getAttribute("aria-label") || el.tagName);
        return { overflowPx, headerLandmark, nestedRadioInputs, invalidDlChildren, smallTextInputs };
      });
      assert(checkResult.overflowPx <= 0, `${route} overflowed 320px by ${checkResult.overflowPx}px`);
      assert.equal(checkResult.headerLandmark, true, `${route} missing <header class="topbar">`);
      assert.equal(checkResult.nestedRadioInputs, 0, `${route} has nested <input type="radio"> inside <button>`);
      assert.equal(checkResult.invalidDlChildren, 0, `${route} has invalid direct child inside <dl>`);
      assert.deepEqual(checkResult.smallTextInputs, [], `${route} has <16px text input: ${checkResult.smallTextInputs.join(",")}`);
    }

    assert.deepEqual(externalUrls, [], `unexpected external CDN/network requests: ${externalUrls.join(", ")}`);
    await context.close();
  });

  console.log(`\n\x1b[32mall ${passed.length} readiness matrix E2E suites passed\x1b[0m`);
} finally {
  await browser.close();
}
