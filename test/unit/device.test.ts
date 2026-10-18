import { describe, expect, it } from "vitest";
import { stableKey } from "../../src/collectors/device";
import type { DeviceSignals } from "../../src/types";

const base: Omit<DeviceSignals, "hash"> = {
  userAgent: "UA/1.0",
  platform: "MacIntel",
  languages: ["en-US"],
  timezone: "Asia/Kolkata",
  timezoneOffset: -330,
  screen: { width: 1512, height: 982, colorDepth: 30, pixelRatio: 2 },
  hardwareConcurrency: 10,
  deviceMemory: 8,
  maxTouchPoints: 0,
  cookieEnabled: true,
  webdriver: false,
  webgl: { vendor: "Apple", renderer: "Apple M1" },
};

describe("stableKey", () => {
  it("ignores fields that change on the same device (browser update, zoom, DST)", () => {
    const later = {
      ...base,
      userAgent: "UA/2.0",
      timezoneOffset: -300,
      screen: { ...base.screen, pixelRatio: 1.5 },
    };
    expect(stableKey(later)).toBe(stableKey(base));
  });

  it("changes when the hardware changes", () => {
    const other = { ...base, webgl: { vendor: "NVIDIA", renderer: "RTX 4090" } };
    expect(stableKey(other)).not.toBe(stableKey(base));
  });
});
