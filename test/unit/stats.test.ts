import { describe, expect, it } from "vitest";
import { RunningStat } from "../../src/core/stats";

describe("RunningStat", () => {
  it("computes mean and sample standard deviation", () => {
    const s = new RunningStat();
    [2, 4, 4, 4, 5, 5, 7, 9].forEach((x) => s.push(x));
    expect(s.take()).toEqual({ n: 8, mean: 5, std: 2.1 });
  });

  it("resets after take()", () => {
    const s = new RunningStat();
    s.push(10);
    s.take();
    expect(s.take()).toEqual({ n: 0, mean: 0, std: 0 });
  });
});
