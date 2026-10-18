import type { Payload, SignalsConfig } from "../types";

/**
 * Hand a payload to the callback and/or the endpoint.
 * sendBeacon is preferred: the browser queues it and delivers it even while the page unloads.
 * When it refuses (no support, or payload over its ~64 KB limit) fall back to fetch with keepalive.
 */
export function send(payload: Payload, config: SignalsConfig): void {
  config.onPayload?.(payload);
  if (!config.endpoint) return;

  const body = JSON.stringify(payload);
  // text/plain keeps the request "simple" in CORS terms: no preflight, which matters on unload.
  const blob = new Blob([body], { type: "text/plain;charset=UTF-8" });
  if (typeof navigator.sendBeacon === "function" && navigator.sendBeacon(config.endpoint, blob)) return;

  void fetch(config.endpoint, {
    method: "POST",
    body,
    keepalive: true,
    credentials: "omit",
    headers: { "Content-Type": "text/plain;charset=UTF-8" },
  }).catch(() => {
    // Network errors are not the host page's problem; drop the batch.
  });
}
