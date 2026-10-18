import { listen } from "../core/safe";
import { RunningStat } from "../core/stats";
import type { Collector, KeystrokeSignals } from "../types";

/** Pauses longer than this are thinking time, not typing rhythm. */
const MAX_FLIGHT_MS = 2000;
/** Elements (or their ancestors) with this attribute are never observed. */
const IGNORE_ATTR = "data-signals-ignore";

/**
 * Keystroke timing: how long keys are held (dwell) and the gaps between them (flight).
 * People type with a steady personal rhythm; scripts and paste-driven fraud usually do not.
 *
 * Privacy: WHICH key was pressed is never stored or sent. `event.code` is used only as a
 * short-lived map key to pair a keydown with its keyup, then dropped.
 */
export function keystrokeCollector(): Collector<KeystrokeSignals> {
  const down = new Map<string, number>(); // event.code -> keydown timeStamp
  const dwell = new RunningStat();
  const flight = new RunningStat();
  let lastUp = -1;
  let count = 0;
  let untrusted = 0;
  let removers: Array<() => void> = [];

  const ignored = (e: KeyboardEvent) =>
    e.target instanceof Element && e.target.closest(`[${IGNORE_ATTR}]`) !== null;

  const onDown = (e: KeyboardEvent) => {
    if (e.repeat || ignored(e)) return; // auto-repeat from a held key is not a new keystroke
    count += 1;
    if (!e.isTrusted) untrusted += 1;
    if (lastUp >= 0) {
      const gap = e.timeStamp - lastUp;
      if (gap >= 0 && gap <= MAX_FLIGHT_MS) flight.push(gap);
    }
    down.set(e.code, e.timeStamp);
  };

  const onUp = (e: KeyboardEvent) => {
    if (ignored(e)) return;
    const start = down.get(e.code);
    if (start === undefined) return; // keyup without a matching keydown (e.g. focus moved in)
    down.delete(e.code);
    dwell.push(e.timeStamp - start);
    lastUp = e.timeStamp;
  };

  return {
    start() {
      if (removers.length) return;
      removers = [listen(document, "keydown", onDown), listen(document, "keyup", onUp)];
    },
    snapshot() {
      if (count === 0) return undefined; // nothing typed in this window: send nothing
      const out = { count, untrusted, dwell: dwell.take(), flight: flight.take() };
      count = 0;
      untrusted = 0;
      return out;
    },
    stop() {
      removers.forEach((r) => r());
      removers = [];
      down.clear();
    },
  };
}
