import { describe, expect, it } from "vitest";
import { branchInteraction } from "@/lib/categories/interaction";

describe("branchInteraction", () => {
  it("desktop: nome seleziona se c’è la categoria, mai il pallino", () => {
    expect(
      branchInteraction({
        mobile: false,
        expandable: true,
        selectable: true,
      }),
    ).toEqual({ nameAction: "select", showRadio: false });
    expect(
      branchInteraction({
        mobile: false,
        expandable: false,
        selectable: true,
      }),
    ).toEqual({ nameAction: "select", showRadio: false });
  });

  it("desktop: gruppo virtuale, il nome non è un’azione", () => {
    expect(
      branchInteraction({
        mobile: false,
        expandable: true,
        selectable: false,
      }),
    ).toEqual({ nameAction: "none", showRadio: false });
  });

  it("mobile: padre selezionabile, nome apre, pallino sì", () => {
    expect(
      branchInteraction({
        mobile: true,
        expandable: true,
        selectable: true,
      }),
    ).toEqual({ nameAction: "toggle", showRadio: true });
  });

  it("mobile: gruppo virtuale, nome apre, niente pallino", () => {
    expect(
      branchInteraction({
        mobile: true,
        expandable: true,
        selectable: false,
      }),
    ).toEqual({ nameAction: "toggle", showRadio: false });
  });

  it("mobile: foglia, tap sul nome seleziona, niente pallino", () => {
    expect(
      branchInteraction({
        mobile: true,
        expandable: false,
        selectable: true,
      }),
    ).toEqual({ nameAction: "select", showRadio: false });
  });
});
