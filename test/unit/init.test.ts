import { afterEach, describe, expect, it } from "vitest";
import { init } from "../../src/index";
import type { Payload, SignalsClient } from "../../src/types";

describe("init", () => {
  let client: SignalsClient | undefined;
  afterEach(() => client?.destroy());

  it("returns the same client when called twice", () => {
    client = init({ onPayload: () => {} });
    expect(init({ onPayload: () => {} })).toBe(client);
  });

  it("collects nothing before consent is granted", async () => {
    const got: Payload[] = [];
    client = init({ requireConsent: true, onPayload: (p) => got.push(p) });
    document.body.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyA", bubbles: true }));
    await client.flush();
    expect(got).toHaveLength(0);

    client.grantConsent();
    document.body.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyA", bubbles: true }));
    document.body.dispatchEvent(new KeyboardEvent("keyup", { code: "KeyA", bubbles: true }));
    await client.flush();
    expect(got).toHaveLength(1);
    expect(got[0].behavior.keystroke?.count).toBe(1);
  });

  it("does not run at all on unsampled page loads", async () => {
    const got: Payload[] = [];
    client = init({ sampleRate: 0, onPayload: (p) => got.push(p) });
    await client.flush();
    expect(got).toHaveLength(0);
  });
});
