import { describe, expect, it } from "vitest";
import { planPrefixRename } from "@/lib/categories/rename";

const rows = [
  { id: "casa", name: "casa" },
  { id: "mutuo", name: "casa.mutuo" },
  { id: "gas", name: "casa.bollette.gas" },
  { id: "extra", name: "monade.stipendio.extra" },
];

describe("planPrefixRename", () => {
  it("sposta il gruppo e tutti i discendenti", () => {
    const plan = planPrefixRename(rows, "monade", "lavoro.monade");
    expect(plan).toEqual({
      ok: true,
      updates: [
        {
          id: "extra",
          name: "lavoro.monade.stipendio.extra",
        },
      ],
    });
  });

  it("rinomina la radice e i figli insieme", () => {
    const plan = planPrefixRename(rows, "casa", "lavoro.casa");
    expect(plan.ok).toBe(true);
    if (!plan.ok) {
      return;
    }

    expect(plan.updates).toEqual([
      { id: "casa", name: "lavoro.casa" },
      { id: "mutuo", name: "lavoro.casa.mutuo" },
      { id: "gas", name: "lavoro.casa.bollette.gas" },
    ]);
  });

  it("non tocca un nome che inizia uguale ma non è un segmento", () => {
    const plan = planPrefixRename(
      [
        { id: "1", name: "monade" },
        { id: "2", name: "monadestra" },
      ],
      "monade",
      "lavoro",
    );
    expect(plan.ok).toBe(true);
    if (!plan.ok) {
      return;
    }

    expect(plan.updates).toEqual([{ id: "1", name: "lavoro" }]);
  });

  it("stesso prefisso è un no-op", () => {
    expect(planPrefixRename(rows, "casa", "casa")).toEqual({
      ok: true,
      updates: [],
    });
  });

  it("rifiuta un prefisso nuovo non valido", () => {
    expect(planPrefixRename(rows, "casa", "  ").ok).toBe(false);
    expect(planPrefixRename(rows, "casa", "a".repeat(101)).ok).toBe(false);
  });

  it("rifiuta se il nuovo nome collide con una categoria fuori dal gruppo", () => {
    const plan = planPrefixRename(rows, "casa.mutuo", "casa");
    expect(plan).toEqual({
      ok: false,
      error: "Esiste già una categoria con questo nome.",
    });
  });

  it("rifiuta se un nome risultante è troppo lungo", () => {
    const plan = planPrefixRename(
      [{ id: "1", name: "ab.lunghissimo" }],
      "ab",
      "x".repeat(95),
    );
    expect(plan.ok).toBe(false);
  });
});
