import { collectDevice } from "./collectors/device";
import { keystrokeCollector } from "./collectors/keystroke";
import { listen, safe, safeAsync } from "./core/safe";
import { send } from "./core/transport";
import type { DeviceSignals, Payload, SignalsClient, SignalsConfig } from "./types";

export type * from "./types";

declare const __SDK_VERSION__: string;
export const version: string = __SDK_VERSION__;

const DEFAULT_FLUSH_MS = 10_000;

const noopClient: SignalsClient = {
  flush: () => Promise.resolve(),
  grantConsent: () => undefined,
  destroy: () => undefined,
};

let active: SignalsClient | null = null;

/**
 * Start the SDK. Calling it again returns the same client: two copies of the SDK on one page
 * (e.g. loaded by a tag manager and by the site) must not double-count events.
 */
export function init(config: SignalsConfig): SignalsClient {
  if (active) return active;
  return safe(() => {
    const sampleRate = config.sampleRate ?? 1;
    if (Math.random() >= sampleRate) return noopClient; // this page load is not sampled
    active = createClient(config);
    return active;
  }, noopClient);
}

function createClient(config: SignalsConfig): SignalsClient {
  const sid = newSessionId();
  const keystrokes = keystrokeCollector();
  // Every collector, for start/stop. New collectors (pointer, paste, focus) join this list.
  const collectors = [keystrokes];

  let started = false;
  let destroyed = false;
  let seq = 0;
  let device: Promise<DeviceSignals | null> | null = null;
  let deviceSent = false;
  let timer: ReturnType<typeof setInterval> | undefined;
  let removers: Array<() => void> = [];

  function start(): void {
    if (started || destroyed) return;
    started = true;
    collectors.forEach((c) => c.start());
    device = safeAsync(collectDevice, null);
    timer = setInterval(() => {
      if (document.visibilityState === "visible") void flush();
    }, config.flushIntervalMs ?? DEFAULT_FLUSH_MS);
    // The last chance to send is when the page is hidden; "pagehide" covers browsers
    // (older Safari) that skip visibilitychange on unload.
    removers = [
      listen(document, "visibilitychange", () => {
        if (document.visibilityState === "hidden") void flush();
      }),
      listen(window, "pagehide", () => void flush()),
    ];
  }

  async function flush(): Promise<void> {
    if (!started || destroyed) return;
    await safeAsync(async () => {
      const payload: Payload = { v: version, sid, seq, ts: Date.now(), behavior: {} };
      if (!deviceSent && device) {
        const d = await device;
        if (d) payload.device = d;
        deviceSent = true;
      }
      const keystroke = keystrokes.snapshot();
      if (keystroke) payload.behavior.keystroke = keystroke;

      if (!payload.device && Object.keys(payload.behavior).length === 0) return; // nothing new
      seq += 1;
      send(payload, config);
    }, undefined);
  }

  if (!config.requireConsent) start();

  return {
    flush,
    grantConsent: () => safe(start, undefined),
    destroy: () =>
      safe(() => {
        destroyed = true;
        clearInterval(timer);
        removers.forEach((r) => r());
        collectors.forEach((c) => c.stop());
        active = null;
      }, undefined),
  };
}

function newSessionId(): string {
  return safe(
    () => crypto.randomUUID(),
    // randomUUID needs a secure context; this fallback is fine for a per-page-load id.
    Date.now().toString(36) + Math.random().toString(36).slice(2),
  );
}
