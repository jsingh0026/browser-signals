import { expect, test, type Page } from "@playwright/test";

const PAGE = "/test/fixtures/index.html";

async function flushAndRead(page: Page) {
  await page.evaluate(() => (window as any).__client.flush());
  return page.evaluate(() => (window as any).__payloads);
}

test("records typing rhythm without recording what was typed", async ({ page }) => {
  await page.goto(PAGE);
  const text = "correct horse battery";
  await page.locator("#name").pressSequentially(text, { delay: 40 });

  const payloads = await flushAndRead(page);
  const ks = payloads.at(-1).behavior.keystroke;
  expect(ks.count).toBe(text.length);
  expect(ks.untrusted).toBe(0); // real input events from the browser
  expect(ks.dwell.mean).toBeGreaterThanOrEqual(0);
  expect(ks.flight.n).toBeGreaterThan(0);
  expect(JSON.stringify(payloads)).not.toContain("horse");
});

test("does not observe fields marked data-signals-ignore", async ({ page }) => {
  await page.goto(PAGE);
  await page.locator("#secret").pressSequentially("hunter2");
  const payloads = await flushAndRead(page);
  expect(payloads.every((p: any) => !p.behavior.keystroke)).toBe(true);
});

test("sends a stable device hash and flags automation", async ({ page }) => {
  await page.goto(PAGE);
  const first = (await flushAndRead(page))[0].device;
  expect(first.hash).toMatch(/^[0-9a-f]{64}$/);
  expect(first.webdriver).toBe(true); // Playwright sets navigator.webdriver

  await page.reload();
  const second = (await flushAndRead(page))[0].device;
  expect(second.hash).toBe(first.hash);
});

test("adds exactly one global to the host page", async ({ page }) => {
  await page.goto(PAGE);
  const added = await page.evaluate(() => {
    const before = new Set((window as any).__keysBefore as string[]);
    return Object.keys(window).filter((k) => !before.has(k) && !k.startsWith("__"));
  });
  expect(added).toEqual(["BrowserSignals"]);
});

test("waits for consent before collecting", async ({ page }) => {
  await page.goto(PAGE + "?consent");
  await page.locator("#name").pressSequentially("abc");
  expect(await flushAndRead(page)).toHaveLength(0);

  await page.evaluate(() => (window as any).__client.grantConsent());
  await page.locator("#name").pressSequentially("abc");
  const payloads = await flushAndRead(page);
  expect(payloads).toHaveLength(1);
  expect(payloads[0].behavior.keystroke.count).toBe(3);
});
