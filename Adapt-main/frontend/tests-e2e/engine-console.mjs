/**
 * End-to-end verification of the `/engine` operator presentation console:
 * - Distinct operator visual layer & non-live honesty (no false telemetry or banned learner jargon)
 * - Plan & credit-rule editing, dynamic plan comparison, localStorage persistence & reset
 * - Calculator edge cases (zero, decimals, large numbers, invalid strings, negative inputs)
 * - Corrupted & SecurityError-blocked browser storage resilience
 * - Sample CSV export (stamped illustrative) & @media print layout
 * - Responsive viewports (320px..1920px), 200% zoom, mobile drawer focus trap + Escape,
 *   skip-link keyboard flow, sticky-header scroll offset, and prefers-reduced-motion
 */
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { chromium } from "playwright";

import { ENGINE_PLANS_KEY, ENGINE_RULES_KEY } from "../src/lib/engine/console.ts";

const BANNED_PHRASES = [
  "API key",
  "Gemini",
  "provider",
  "model",
  "endpoint",
  "GET /",
  "POST /",
  "uvicorn",
  "ignored_keys",
  "AI 1",
  "AI 2",
  "AI 3",
  "token",
  "Pack",
];

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

const summary = [];

function check(name, fn) {
  return fn().then(() => {
    summary.push(name);
    console.log(`  \x1b[32mok\x1b[0m  ${name}`);
  });
}

function assertValidHeadingOrder(levels, label) {
  assert(levels.length >= 4, `${label}: expected structured headings`);
  assert.equal(levels[0], 1, `${label}: first heading must be H1`);
  assert.equal(levels.filter((n) => n === 1).length, 1, `${label}: expected single H1`);
  for (let i = 1; i < levels.length; i += 1) {
    assert(
      levels[i] <= levels[i - 1] + 1,
      `${label}: heading jump H${levels[i - 1]} -> H${levels[i]} at index ${i}`,
    );
  }
}

try {
  console.log("\x1b[1m/engine presentation console E2E\x1b[0m");

  // 1. Desktop operator identity, honesty, landmarks, skip link, editing, persistence, reset & CSV
  await check("operator identity, non-live honesty, skip link, plan edit/compare/save/reset & CSV export", async () => {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      acceptDownloads: true,
    });
    const page = await context.newPage();
    const errors = [];
    const apiRequests = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("request", (req) => {
      if (req.url().includes("/api/")) apiRequests.push(req.url());
    });

    await page.goto(`${BASE}/engine`, { waitUntil: "networkidle" });
    assert.equal(errors.length, 0, `unexpected page errors: ${errors.join("; ")}`);
    assert.equal(apiRequests.length, 0, `/engine should be self-contained and make 0 live API calls, got ${apiRequests.join(", ")}`);

    // Non-live framing & standard-mode fallback accuracy
    const visibleText = await page.locator("body").innerText();
    assert.match(visibleText, /Presentation console · local only/);
    assert.match(visibleText, /Presentation · example data/);
    assert.match(visibleText, /Example figures · not live telemetry/);
    assert.match(visibleText, /Stateless HTTP contract/);
    assert.match(visibleText, /Schema example/);
    assert.doesNotMatch(visibleText, /Engine available/i);
    assert.doesNotMatch(visibleText, /\blive route\b/i);
    assert.match(visibleText, /Genlink course notes, standard quizzes, and Adapt’s built-in deterministic simple-mode lessons stay available/);

    const banned = BANNED_PHRASES.find((phrase) => visibleText.toLowerCase().includes(phrase.toLowerCase())) ?? null;
    assert.equal(banned, null, `banned phrase found on /engine: ${banned}`);

    // Landmarks & heading order
    const structure = await page.evaluate(() => {
      const main = document.getElementById("main-content");
      const aside = document.querySelector("aside.engine-rail");
      const header = document.querySelector("header.engine-topbar");
      const levels = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].map((h) => Number(h.tagName.slice(1)));
      return {
        mainTag: main?.tagName,
        asideOutsideMain: Boolean(aside && main && !main.contains(aside)),
        headerOutsideMain: Boolean(header && main && !main.contains(header)),
        tableHeaders: document.querySelectorAll("table.activity-table th[scope='col']").length,
        levels,
      };
    });
    assert.equal(structure.mainTag, "MAIN");
    assert.equal(structure.asideOutsideMain, true);
    assert.equal(structure.headerOutsideMain, true);
    assert.equal(structure.tableHeaders, 5);
    assertValidHeadingOrder(structure.levels, "desktop read mode");

    // Keyboard skip link -> #main-content
    await page.keyboard.press("Tab");
    const skipHref = await page.evaluate(() => document.activeElement?.getAttribute("href"));
    assert.equal(skipHref, "#main-content");
    await page.keyboard.press("Enter");
    const focusedAfterSkip = await page.evaluate(() => document.activeElement?.id);
    assert.equal(focusedAfterSkip, "main-content");

    // Sticky topbar scroll clearance when jumping to #activity
    await page.locator('aside.engine-rail a[href="#activity"]').click();
    const clearance = await page.evaluate(() => {
      const bar = document.querySelector("header.engine-topbar").getBoundingClientRect();
      const target = document.getElementById("activity").getBoundingClientRect();
      return { barBottom: bar.bottom, targetTop: target.top };
    });
    assert(
      clearance.targetTop >= clearance.barBottom - 2,
      `#activity (${clearance.targetTop}px) hidden behind sticky topbar (${clearance.barBottom}px)`,
    );

    // Edit plans & credit rules -> verify heading hierarchy holds -> save -> reload -> compare -> reset
    await page.getByRole("button", { name: "Configure engine" }).click();
    const editLevels = await page.evaluate(() =>
      [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].map((h) => Number(h.tagName.slice(1))),
    );
    assertValidHeadingOrder(editLevels, "desktop edit mode");

    await page.locator("#plan-name-core").fill("Campus Core");
    await page.getByLabel("Campus Core included credits").fill("12000");
    await page.getByLabel("Campus Core learner capacity").fill("250");
    await page.getByLabel("Adapt a concept credit cost").fill("1.5");
    await page.getByRole("button", { name: "Save configuration" }).click();

    await page.reload({ waitUntil: "networkidle" });
    const afterReload = await page.locator("body").innerText();
    assert.match(afterReload, /Campus Core/);
    assert.match(afterReload, /1\.5 cr/);

    // Estimator comparison reflects edited Campus Core (12,000 credits & 250 learner cap vs 500 learners / 31,500 credits)
    const estimateCardText = await page.locator(".estimate-card").innerText();
    assert.match(estimateCardText, /Campus Core · 12,000 cr · up to 250 learners/);
    assert.match(estimateCardText, /Campus Core is short by 19,500 credits and 250 learners/);
    assert.match(estimateCardText, /Consider Plus/);

    // Sample CSV export is downloadable and explicitly stamped illustrative
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download sample CSV" }).click();
    const download = await downloadPromise;
    assert.equal(download.suggestedFilename(), "adapt-engine-illustrative-example.csv");
    const csvPath = await download.path();
    const csvText = await readFile(csvPath, "utf8");
    assert.match(csvText, /ILLUSTRATIVE|EXAMPLE|NON-FINAL/i);
    assert.match(csvText, /Campus Core/);

    // Reset configuration restores defaults and clears storage
    await page.getByRole("button", { name: "Reset examples" }).click();
    const afterResetPlans = await page.locator("#plans").innerText();
    assert.match(afterResetPlans, /25,000/);
    assert.doesNotMatch(afterResetPlans, /Campus Core/);
    const storedAfterReset = await page.evaluate(
      ([pk, rk]) => ({
        plans: window.localStorage.getItem(pk),
        rules: window.localStorage.getItem(rk),
      }),
      [ENGINE_PLANS_KEY, ENGINE_RULES_KEY],
    );
    assert.equal(storedAfterReset.plans, null);
    assert.equal(storedAfterReset.rules, null);

    await context.close();
  });

  // 2. Calculator edge cases (zero, decimal, large, invalid, negative)
  await check("calculator handles zero, decimal, large, negative and non-numeric inputs cleanly", async () => {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();
    await page.goto(`${BASE}/engine`, { waitUntil: "networkidle" });

    const learnersInput = page.getByRole("textbox", { name: "Total learners" });
    const actionsInput = page.getByRole("textbox", { name: "Adapted actions / active learner / week" });

    // Zero learners -> 0 credits, fits cleanly
    await learnersInput.fill("0");
    await learnersInput.blur();
    let cardText = await page.locator(".estimate-card").innerText();
    assert.match(cardText, /\b0\nAdapt Credits \/ year/);
    assert.doesNotMatch(cardText, /NaN|Infinity|-\d/);

    // Decimal actions (1.25) & large learner count (12,000) -> 12000 * 0.70 * 1.25 * 30 * 1.5 = 472,500 credits
    await learnersInput.fill("12000");
    await learnersInput.blur();
    await actionsInput.fill("1.25");
    await actionsInput.blur();
    cardText = await page.locator(".estimate-card").innerText();
    assert.match(cardText, /472,500/);
    assert.doesNotMatch(cardText, /NaN|Infinity/);

    // Invalid string & negative number -> status notice + clamped non-negative finite output
    await learnersInput.fill("abc");
    await page.locator(".calc-validation-note").waitFor({ state: "visible" });
    cardText = await page.locator(".estimate-card").innerText();
    assert.doesNotMatch(cardText, /NaN|Infinity/);

    await learnersInput.fill("-250");
    cardText = await page.locator(".estimate-card").innerText();
    assert.doesNotMatch(cardText, /NaN|Infinity|-\d/);

    // Reset estimator button restores 31,500
    await page.getByRole("button", { name: "Reset estimator" }).click();
    cardText = await page.locator(".estimate-card").innerText();
    assert.match(cardText, /31,500/);

    await context.close();
  });

  // 3. Corrupted localStorage & SecurityError-blocked storage resilience
  await check("corrupted JSON and SecurityError-blocked localStorage never crash /engine", async () => {
    // 3a: Corrupted JSON + malformed objects
    const corruptCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const corruptPage = await corruptCtx.newPage();
    const corruptErrors = [];
    corruptPage.on("pageerror", (e) => corruptErrors.push(e.message));
    await corruptPage.addInitScript(
      ([pk, rk]) => {
        window.localStorage.setItem(pk, "{not-valid-json");
        window.localStorage.setItem(rk, JSON.stringify([{ id: "explain", credits: "NaN-bad" }]));
      },
      [ENGINE_PLANS_KEY, ENGINE_RULES_KEY],
    );
    await corruptPage.goto(`${BASE}/engine`, { waitUntil: "networkidle" });
    assert.equal(corruptErrors.length, 0);
    await corruptPage.locator(".engine-status-banner").waitFor({ state: "visible" });
    assert.match(await corruptPage.locator(".engine-status-banner").innerText(), /Restored valid example defaults/);
    await corruptCtx.close();

    // 3b: Completely blocked localStorage & sessionStorage throwing SecurityError
    const blockedCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const blockedPage = await blockedCtx.newPage();
    const blockedErrors = [];
    blockedPage.on("pageerror", (e) => blockedErrors.push(e.message));
    await blockedPage.addInitScript(() => {
      const deny = () => {
        throw new DOMException("Storage disabled by policy", "SecurityError");
      };
      Object.defineProperty(window, "localStorage", { get: deny, configurable: true });
      Object.defineProperty(window, "sessionStorage", { get: deny, configurable: true });
    });
    await blockedPage.goto(`${BASE}/engine`, { waitUntil: "networkidle" });
    assert.equal(blockedErrors.length, 0, `blocked storage crashed: ${blockedErrors.join("; ")}`);
    await blockedPage.getByRole("button", { name: "Configure engine" }).click();
    await blockedPage.getByRole("button", { name: "Save configuration" }).click();
    assert.match(await blockedPage.locator(".engine-status-banner").innerText(), /storage is unavailable/i);
    assert.equal(blockedErrors.length, 0);
    await blockedCtx.close();
  });

  // 4. Responsive viewports (320px..1920px), 200% zoom, mobile drawer focus trap + Escape, print & reduced motion
  await check("responsive viewports (320..1920px), 200% zoom, mobile drawer focus trap, print & reduced motion", async () => {
    const viewports = [
      { width: 320, height: 568, mobile: true },
      { width: 375, height: 812, mobile: true },
      { width: 640, height: 450, mobile: true }, // 1280x900 at 200% zoom
      { width: 768, height: 1024, mobile: true },
      { width: 1024, height: 768, mobile: false },
      { width: 1440, height: 900, mobile: false },
      { width: 1920, height: 1080, mobile: false },
    ];

    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();

    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(`${BASE}/engine`, { waitUntil: "networkidle" });
      if (vp.width === 320) {
        await page.getByRole("button", { name: "Configure engine" }).click();
      }
      const metrics = await page.evaluate(() => {
        const overflowPx = document.documentElement.scrollWidth - window.innerWidth;
        const smallInputs = [...document.querySelectorAll("input:not([type='range']), select")]
          .filter((el) => el.getBoundingClientRect().width > 0)
          .filter((el) => parseFloat(getComputedStyle(el).fontSize) < 16)
          .map((el) => el.id || el.className);
        const smallButtons = [...document.querySelectorAll("button")]
          .filter((el) => el.getBoundingClientRect().width > 0 && el.tabIndex !== -1)
          .filter((el) => {
            const r = el.getBoundingClientRect();
            return r.width < 24 || r.height < 24;
          })
          .map((el) => el.textContent?.trim());
        const transitionDuration = getComputedStyle(document.querySelector(".engine-button")).transitionDuration;
        return { overflowPx, smallInputs, smallButtons, transitionDuration };
      });
      assert(metrics.overflowPx <= 0, `overflow ${metrics.overflowPx}px at ${vp.width}x${vp.height}`);
      assert.deepEqual(metrics.smallInputs, [], `<16px inputs at ${vp.width}: ${metrics.smallInputs.join(",")}`);
      assert.deepEqual(metrics.smallButtons, [], `<24px buttons at ${vp.width}: ${metrics.smallButtons.join(",")}`);
      assert.equal(metrics.transitionDuration, "0s", "prefers-reduced-motion should disable button transitions");
    }

    // Mobile drawer keyboard focus trap + Escape at 375x812
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${BASE}/engine`, { waitUntil: "networkidle" });
    const menuBtn = page.getByRole("button", { name: "Sections", exact: true });
    await menuBtn.focus();
    await page.keyboard.press("Enter");
    assert.equal(await menuBtn.getAttribute("aria-expanded"), "true");

    for (let i = 0; i < 12; i += 1) {
      await page.keyboard.press("Tab");
      const insideDrawer = await page.evaluate(() =>
        Boolean(document.getElementById("engine-rail-drawer")?.contains(document.activeElement)),
      );
      assert.equal(insideDrawer, true, `Tab press ${i + 1} escaped mobile drawer focus trap`);
    }

    await page.keyboard.press("Escape");
    assert.equal(await menuBtn.getAttribute("aria-expanded"), "false");
    const returnedFocus = await page.evaluate(() => document.activeElement?.textContent?.includes("Sections"));
    assert.equal(returnedFocus, true, "Escape should return focus to Sections trigger");

    // Print view verification
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.emulateMedia({ media: "print" });
    const printState = await page.evaluate(() => {
      const banner = getComputedStyle(document.querySelector(".engine-print-banner")).display;
      const rail = getComputedStyle(document.querySelector(".engine-rail")).display;
      const topbar = getComputedStyle(document.querySelector(".engine-topbar")).display;
      return { banner, rail, topbar };
    });
    assert.equal(printState.banner, "block");
    assert.equal(printState.rail, "none");
    assert.equal(printState.topbar, "none");

    await context.close();
  });

  console.log(`\n\x1b[32mall ${summary.length} /engine E2E suites passed\x1b[0m`);
} finally {
  await browser.close();
}
