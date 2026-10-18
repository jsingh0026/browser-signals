import { sha256Hex } from "../core/hash";
import { safe, safeAsync } from "../core/safe";
import type { DeviceSignals } from "../types";

type NavigatorExtras = Navigator & { deviceMemory?: number };

/**
 * One-shot snapshot of browser and device properties.
 * Every read is guarded: privacy browsers and extensions often stub or throw on these APIs,
 * and a missing value is itself a signal, so we record null instead of failing.
 */
export async function collectDevice(): Promise<DeviceSignals> {
  const nav = navigator as NavigatorExtras;
  const signals: Omit<DeviceSignals, "hash"> = {
    userAgent: safe(() => nav.userAgent, ""),
    platform: safe(() => nav.platform, ""),
    languages: safe(() => Array.from(nav.languages ?? [nav.language]), []),
    timezone: safe(() => Intl.DateTimeFormat().resolvedOptions().timeZone, ""),
    timezoneOffset: safe(() => new Date().getTimezoneOffset(), 0),
    screen: safe(
      () => ({
        width: screen.width,
        height: screen.height,
        colorDepth: screen.colorDepth,
        pixelRatio: window.devicePixelRatio,
      }),
      { width: 0, height: 0, colorDepth: 0, pixelRatio: 0 },
    ),
    hardwareConcurrency: safe(() => nav.hardwareConcurrency ?? null, null),
    deviceMemory: safe(() => nav.deviceMemory ?? null, null), // Chromium only
    maxTouchPoints: safe(() => nav.maxTouchPoints ?? 0, 0),
    cookieEnabled: safe(() => nav.cookieEnabled, false),
    webdriver: safe(() => nav.webdriver === true, false),
    webgl: safe(readWebGL, null),
  };

  return { ...signals, hash: await safeAsync(() => sha256Hex(stableKey(signals)), null) };
}

/**
 * The fields that should not change between visits on the same device and browser.
 * Left out on purpose: userAgent (changes with every browser update), pixelRatio (changes with
 * page zoom), timezoneOffset (changes with daylight saving), webdriver (a per-session flag).
 */
export function stableKey(s: Omit<DeviceSignals, "hash">): string {
  return JSON.stringify([
    s.platform,
    s.languages,
    s.timezone,
    s.screen.width,
    s.screen.height,
    s.screen.colorDepth,
    s.hardwareConcurrency,
    s.deviceMemory,
    s.maxTouchPoints,
    s.webgl?.vendor ?? null,
    s.webgl?.renderer ?? null,
  ]);
}

/** GPU vendor and renderer strings from a throwaway WebGL context. */
function readWebGL(): { vendor: string; renderer: string } | null {
  const canvas = document.createElement("canvas");
  const gl = canvas.getContext("webgl") as WebGLRenderingContext | null;
  if (!gl) return null;
  try {
    // Chromium exposes the real GPU through this extension. Firefox deprecates it and
    // returns the real values from the plain RENDERER/VENDOR parameters instead.
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    const vendor = gl.getParameter(ext ? ext.UNMASKED_VENDOR_WEBGL : gl.VENDOR);
    const renderer = gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER);
    return { vendor: String(vendor ?? ""), renderer: String(renderer ?? "") };
  } finally {
    // Browsers cap live WebGL contexts per page; give ours back immediately.
    gl.getExtension("WEBGL_lose_context")?.loseContext();
  }
}
