// The SDK runs inside someone else's page. Two rules follow from that:
//   1. It must never throw into the host page: every entry point is wrapped.
//   2. It must be able to remove everything it added: every listener returns its own remover.

/** Run `fn`; on any error return `fallback` instead of throwing. */
export function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

/** Like `safe`, for async work. */
export async function safeAsync<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

/**
 * Add a capture-phase, passive listener and return a function that removes it.
 * Capture phase: we see the event even if the page calls stopPropagation().
 * Passive: we promise not to call preventDefault(), so we never slow scrolling or input.
 */
export function listen<K extends keyof DocumentEventMap>(
  target: Document,
  type: K,
  handler: (e: DocumentEventMap[K]) => void,
): () => void;
export function listen<K extends keyof WindowEventMap>(
  target: Window,
  type: K,
  handler: (e: WindowEventMap[K]) => void,
): () => void;
export function listen(target: EventTarget, type: string, handler: (e: Event) => void): () => void {
  const wrapped = (e: Event) => safe(() => handler(e), undefined);
  const opts: AddEventListenerOptions = { capture: true, passive: true };
  target.addEventListener(type, wrapped, opts);
  return () => target.removeEventListener(type, wrapped, opts);
}
