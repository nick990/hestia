import { describe, expect, it } from "vitest";
import {
  clampLinkCurveBend,
  createSankeyLinkPath,
  curvedLinkPath,
  straightRibbonPath,
} from "./sankey-link-path";

const sampleLink = {
  source: { x0: 80, x1: 100 },
  target: { x0: 200, x1: 216 },
  y0: 50,
  y1: 80,
  width: 20,
};

describe("clampLinkCurveBend", () => {
  it("limita tra 0 e 100", () => {
    expect(clampLinkCurveBend(-5)).toBe(0);
    expect(clampLinkCurveBend(0)).toBe(0);
    expect(clampLinkCurveBend(50)).toBe(50);
    expect(clampLinkCurveBend(100)).toBe(100);
    expect(clampLinkCurveBend(150)).toBe(100);
  });
});

describe("curvedLinkPath", () => {
  it("bend 50% coincide con linkHorizontal d3", () => {
    expect(curvedLinkPath(sampleLink, 0.5)).toBe("M100,50C150,50,150,80,200,80");
  });

  it("bend 20% sposta il flesso verso la sorgente", () => {
    expect(curvedLinkPath(sampleLink, 0.2)).toBe("M100,50C120,50,120,80,200,80");
  });

  it("bend 80% sposta il flesso verso la destinazione", () => {
    expect(curvedLinkPath(sampleLink, 0.8)).toBe("M100,50C180,50,180,80,200,80");
  });

  it("bend 0% ancora flesso sulla sorgente", () => {
    expect(curvedLinkPath(sampleLink, 0)).toBe("M100,50C100,50,100,80,200,80");
  });

  it("bend 100% ancora flesso sulla destinazione", () => {
    expect(curvedLinkPath(sampleLink, 1)).toBe("M100,50C200,50,200,80,200,80");
  });
});

describe("createSankeyLinkPath", () => {
  it("curved default (50) usa bezier simmetrica", () => {
    const path = createSankeyLinkPath("curved")(sampleLink);
    expect(path).toBe("M100,50C150,50,150,80,200,80");
  });

  it("curved con bend 20 usa flesso spostato", () => {
    const path = createSankeyLinkPath("curved", 20)(sampleLink);
    expect(path).toBe("M100,50C120,50,120,80,200,80");
  });

  it("straight ignora bend e usa nastro trapezoidale", () => {
    const path = createSankeyLinkPath("straight", 20)(sampleLink);
    expect(path).toBe(straightRibbonPath(sampleLink));
    expect(path).toMatch(/Z$/);
  });
});
