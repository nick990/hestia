import { describe, expect, it } from "vitest";
import { resolveSplitPersistence } from "@/lib/saldi/persist";

describe("resolveSplitPersistence", () => {
  it("split assente → delete", () => {
    expect(
      resolveSplitPersistence({
        type: "expense",
        isPrivate: false,
        amount: 80,
        split: undefined,
      }),
    ).toEqual({ action: "delete" });
  });

  it("entrata o privato → delete", () => {
    expect(
      resolveSplitPersistence({
        type: "income",
        isPrivate: false,
        amount: 80,
        split: { payerKind: "member", payerUserId: "nic", customSplit: false },
      }),
    ).toEqual({ action: "delete" });
    expect(
      resolveSplitPersistence({
        type: "expense",
        isPrivate: true,
        amount: 80,
        split: { payerKind: "member", payerUserId: "nic", customSplit: false },
      }),
    ).toEqual({ action: "delete" });
  });

  it("importo ≤ 0 → delete", () => {
    expect(
      resolveSplitPersistence({
        type: "expense",
        isPrivate: false,
        amount: 0,
        split: { payerKind: "member", payerUserId: "nic", customSplit: false },
      }),
    ).toEqual({ action: "delete" });
  });

  it("membro, customSplit false → upsert 100% pagante", () => {
    expect(
      resolveSplitPersistence({
        type: "expense",
        isPrivate: false,
        amount: 50,
        split: { payerKind: "member", payerUserId: "nic", customSplit: false },
      }),
    ).toEqual({
      action: "upsert",
      payerKind: "member",
      payerUserId: "nic",
      splitMode: "equal",
      shares: [{ userId: "nic", amount: 50 }],
    });
  });

  it("famiglia pagante → upsert senza quote", () => {
    expect(
      resolveSplitPersistence({
        type: "expense",
        isPrivate: false,
        amount: 80,
        split: { payerKind: "family", customSplit: false },
      }),
    ).toEqual({
      action: "upsert",
      payerKind: "family",
      payerUserId: null,
      splitMode: "equal",
      shares: [],
    });
  });

  it("customSplit true → equal materializza le quote", () => {
    const result = resolveSplitPersistence({
      type: "expense",
      isPrivate: false,
      amount: 80,
      split: {
        payerKind: "member",
        payerUserId: "nic",
        customSplit: true,
        splitMode: "equal",
        shares: [{ userId: "nic" }, { userId: "sara" }],
      },
    });
    expect(result).toEqual({
      action: "upsert",
      payerKind: "member",
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
        payerKind: "member",
        payerUserId: "nic",
        customSplit: true,
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
        payerKind: "member",
        payerUserId: "nic",
        customSplit: true,
        splitMode: "amount",
        shares: [
          { userId: "nic", amount: 30 },
          { userId: "sara", amount: 50 },
        ],
      },
    });
    expect(result.action).toBe("upsert");
  });

  it("customSplit true, nessun membro → error", () => {
    const result = resolveSplitPersistence({
      type: "expense",
      isPrivate: false,
      amount: 80,
      split: {
        payerKind: "member",
        payerUserId: "nic",
        customSplit: true,
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
