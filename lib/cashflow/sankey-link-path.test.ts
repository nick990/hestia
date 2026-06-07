import { describe, expect, it } from "vitest";
import { createSankeyLinkPath } from "./sankey-link-path";

const sampleLink = {
  source: { x0: 80, x1: 100 },
  target: { x0: 200, x1: 216 },
  y0: 50,
  y1: 80,
};

describe("createSankeyLinkPath", () => {
  it("curved usa bezier orizzontale (come d3-sankey)", () => {
    const path = createSankeyLinkPath("curved")(sampleLink);
    expect(path).toMatch(/^M100,50C/);
    expect(path).toContain("200,80");
  });

  it("straight traccia segmento rettilineo", () => {
    const path = createSankeyLinkPath("straight")(sampleLink);
    expect(path).toBe("M100,50L200,80");
  });
});
