import { afterEach, describe, expect, it } from "vitest";
import { keystrokeCollector } from "../../src/collectors/keystroke";

function press(target: EventTarget, code: string, opts: KeyboardEventInit = {}) {
  target.dispatchEvent(new KeyboardEvent("keydown", { code, key: code, bubbles: true, ...opts }));
  target.dispatchEvent(new KeyboardEvent("keyup", { code, key: code, bubbles: true, ...opts }));
}

describe("keystrokeCollector", () => {
  const c = keystrokeCollector();
  afterEach(() => {
    c.stop();
    document.body.innerHTML = "";
  });

  it("counts keystrokes and flags synthetic (untrusted) events", () => {
    c.start();
    ["KeyA", "KeyB", "KeyC"].forEach((k) => press(document.body, k));
    const snap = c.snapshot();
    expect(snap?.count).toBe(3);
    // dispatchEvent() from script is never trusted: exactly the signal a bot leaves.
    expect(snap?.untrusted).toBe(3);
    expect(snap?.dwell.n).toBe(3);
  });

  it("never includes which keys were pressed", () => {
    c.start();
    ["KeyS", "KeyE", "KeyC", "KeyR", "KeyE", "KeyT"].forEach((k) => press(document.body, k));
    const json = JSON.stringify(c.snapshot());
    expect(json).not.toMatch(/Key[A-Z]/);
  });

  it("ignores auto-repeat and elements marked data-signals-ignore", () => {
    document.body.innerHTML = `<div data-signals-ignore><input id="pw"></div>`;
    c.start();
    press(document.getElementById("pw")!, "KeyA");
    press(document.body, "KeyB", { repeat: true });
    expect(c.snapshot()).toBeUndefined();
  });

  it("stops listening after stop()", () => {
    c.start();
    c.stop();
    press(document.body, "KeyA");
    expect(c.snapshot()).toBeUndefined();
  });
});
