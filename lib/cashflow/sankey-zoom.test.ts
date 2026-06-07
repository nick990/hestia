import { describe, expect, it } from "vitest";
import {
  computeFitTransform,
  SANKEY_ZOOM_MAX,
  SANKEY_ZOOM_MIN,
} from "@/lib/cashflow/sankey-zoom";

describe("computeFitTransform", () => {
  it("scala down contenuto più grande del viewport (landscape)", () => {
    const result = computeFitTransform(800, 400, 960, 800, 24);

    expect(result.k).toBeLessThan(1);
    expect(result.k).toBeGreaterThanOrEqual(SANKEY_ZOOM_MIN);
    expect(result.x).toBeGreaterThan(0);
    expect(result.y).toBeGreaterThan(0);
  });

  it("scala down contenuto più alto del viewport (portrait)", () => {
    const result = computeFitTransform(400, 900, 960, 1200, 24);

    expect(result.k).toBeCloseTo((400 - 48) / 960, 5);
    expect(result.x).toBeGreaterThan(0);
  });

  it("non upscala contenuto più piccolo del viewport", () => {
    const result = computeFitTransform(800, 600, 400, 300, 24);

    expect(result.k).toBe(1);
    expect(result.x).toBe(200);
    expect(result.y).toBe(150);
  });

  it("rispetta padding sui bordi", () => {
    const result = computeFitTransform(500, 500, 500, 500, 24);

    expect(result.k).toBeCloseTo((500 - 48) / 500, 5);
    expect(result.x).toBe(24);
    expect(result.y).toBe(24);
  });

  it("non scende sotto SANKEY_ZOOM_MIN", () => {
    const result = computeFitTransform(100, 100, 960, 5000, 24);

    expect(result.k).toBe(SANKEY_ZOOM_MIN);
  });

  it("esporta limiti coerenti con d3 scaleExtent", () => {
    expect(SANKEY_ZOOM_MIN).toBe(0.3);
    expect(SANKEY_ZOOM_MAX).toBe(4);
  });
});
