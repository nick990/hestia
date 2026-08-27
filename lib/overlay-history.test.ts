import { describe, expect, it } from "vitest";
import {
  nextOverlayHistoryState,
  overlayIdFromState,
  shouldCloseOverlayOnPop,
  shouldPopHistoryOnUiClose,
} from "@/lib/overlay-history";

describe("overlayIdFromState", () => {
  it("legge l'id overlay e ignora junk", () => {
    expect(overlayIdFromState(null)).toBeNull();
    expect(overlayIdFromState(undefined)).toBeNull();
    expect(overlayIdFromState({ __NA: true })).toBeNull();
    expect(overlayIdFromState({ __hestiaOverlay: 1 })).toBeNull();
    expect(overlayIdFromState({ __hestiaOverlay: "dlg-1" })).toBe("dlg-1");
  });
});

describe("nextOverlayHistoryState", () => {
  it("clona lo state Next e aggiunge l'overlay", () => {
    expect(
      nextOverlayHistoryState({ __NA: true, tree: { x: 1 } }, "dlg-1"),
    ).toEqual({
      __NA: true,
      tree: { x: 1 },
      __hestiaOverlay: "dlg-1",
    });
  });

  it("parte da oggetto vuoto se lo state manca", () => {
    expect(nextOverlayHistoryState(null, "dlg-1")).toEqual({
      __hestiaOverlay: "dlg-1",
    });
  });
});

describe("shouldCloseOverlayOnPop", () => {
  it("chiude solo se avevamo pushato e lo state non è più nostro", () => {
    expect(shouldCloseOverlayOnPop(false, "a", { __hestiaOverlay: "b" })).toBe(
      false,
    );
    expect(shouldCloseOverlayOnPop(true, "a", { __hestiaOverlay: "a" })).toBe(
      false,
    );
    expect(shouldCloseOverlayOnPop(true, "a", { __hestiaOverlay: "b" })).toBe(
      true,
    );
    expect(shouldCloseOverlayOnPop(true, "a", { __NA: true })).toBe(true);
  });
});

describe("shouldPopHistoryOnUiClose", () => {
  it("fa back solo se siamo ancora sulla voce overlay", () => {
    expect(shouldPopHistoryOnUiClose(true, "a", { __hestiaOverlay: "a" })).toBe(
      true,
    );
    expect(shouldPopHistoryOnUiClose(true, "a", { __hestiaOverlay: "b" })).toBe(
      false,
    );
    expect(shouldPopHistoryOnUiClose(false, "a", { __hestiaOverlay: "a" })).toBe(
      false,
    );
  });
});
