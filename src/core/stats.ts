import type { Stat } from "../types";

/**
 * Running mean and standard deviation (Welford's algorithm).
 * O(1) memory however many samples arrive, so collectors never store raw event lists.
 */
export class RunningStat {
  private n = 0;
  private mean = 0;
  private m2 = 0;

  push(x: number): void {
    this.n += 1;
    const delta = x - this.mean;
    this.mean += delta / this.n;
    this.m2 += delta * (x - this.mean);
  }

  /** Current values, rounded to 0.1 ms; then reset for the next window. */
  take(): Stat {
    const std = this.n > 1 ? Math.sqrt(this.m2 / (this.n - 1)) : 0;
    const out = { n: this.n, mean: round(this.mean), std: round(std) };
    this.n = 0;
    this.mean = 0;
    this.m2 = 0;
    return out;
  }
}

function round(x: number): number {
  return Math.round(x * 10) / 10;
}
