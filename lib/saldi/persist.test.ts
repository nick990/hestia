import { describe, expect, it } from "vitest";
import { resolveSplitPersistence } from "@/lib/saldi/persist";

const splitOn = {
  enabled: true as const,
  payerUserId: "nic",
  splitMode: "equal" as const,
  shares: [{ userId: "nic" }, { userId: "sara" }],
};

describe("resolveSplitPersistence", () => {
  it("toggle spento o assente → delete", () => {
    expect(
      resolveSplitPersistence({
        type: "expense",
        isPrivate: false,
        amount: 80,
        split: { enabled: false },
      }),
    ).toEqual({ action: "delete" });
    expect(
      resolveSplitPersistence({
        type: "expense",
        isPrivate: false,
        amount: 80,
        split: undefined,
      }),
    ).toEqual({ action: "delete" });
  });

  it("entrata o privato → delete anche se toggle acceso", () => {
    expect(
      resolveSplitPersistence({
        type: "income",
        isPrivate: false,
        amount: 80,
        split: splitOn,
      }),
    ).toEqual({ action: "delete" });
    expect(
      resolveSplitPersistence({
        type: "expense",
        isPrivate: true,
        amount: 80,
        split: splitOn,
      }),
    ).toEqual({ action: "delete" });
  });

  it("importo ≤ 0 → delete", () => {
    expect(
      resolveSplitPersistence({
        type: "expense",
        isPrivate: false,
        amount: 0,
        split: splitOn,
      }),
    ).toEqual({ action: "delete" });
  });

  it("equal materializza le quote", () => {
    const result = resolveSplitPersistence({
      type: "expense",
      isPrivate: false,
      amount: 80,
      split: splitOn,
    });
    expect(result).toEqual({
      action: "upsert",
      payerUserId: "nic",
      splitMode: "equal",
      shares: [
        { userId: "nic", amount: 40 },
        { userId: "sara", amount: 40 },
      ],
    });
  });

  it("amount: somma diversa → error", () => {
    const result = resolveSplitPersistence({
      type: "expense",
      isPrivate: false,
      amount: 80,
      split: {
        enabled: true,
        payerUserId: "nic",
        splitMode: "amount",
        shares: [
          { userId: "nic", amount: 30 },
          { userId: "sara", amount: 40 },
        ],
      },
    });
    expect(result).toEqual({
      action: "error",
      error: "La somma delle quote deve coincidere con l'importo.",
    });
  });

  it("amount: somma ok", () => {
    const result = resolveSplitPersistence({
      type: "expense",
      isPrivate: false,
      amount: 80,
      split: {
        enabled: true,
        payerUserId: "nic",
        splitMode: "amount",
        shares: [
          { userId: "nic", amount: 30 },
          { userId: "sara", amount: 50 },
        ],
      },
    });
    expect(result.action).toBe("upsert");
  });

  it("nessun membro → error", () => {
    const result = resolveSplitPersistence({
      type: "expense",
      isPrivate: false,
      amount: 80,
      split: {
        enabled: true,
        payerUserId: "nic",
        splitMode: "equal",
        shares: [],
      },
    });
    expect(result).toEqual({
      action: "error",
      error: "Ripartisci spesa richiede almeno un membro.",
    });
  });
});
