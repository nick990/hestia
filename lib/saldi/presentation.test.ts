import { describe, expect, it } from "vitest";
import {
  defaultReimbursement,
  sortPersonNets,
  transferLine,
} from "@/lib/saldi/presentation";
import type { PersonNet } from "@/lib/saldi/types";

describe("transferLine", () => {
  const names = new Map([
    ["nic", "Nic"],
    ["sara", "Sara"],
  ]);

  it("debitore vede Devi pagare", () => {
    expect(
      transferLine(
        { fromUserId: "nic", toUserId: "sara", amount: 20 },
        "nic",
        names,
      ),
    ).toBe("Devi pagare 20,00 € a Sara");
  });

  it("creditore vede ti deve", () => {
    expect(
      transferLine(
        { fromUserId: "sara", toUserId: "nic", amount: 20 },
        "nic",
        names,
      ),
    ).toBe("Sara ti deve 20,00 €");
  });
});

describe("sortPersonNets", () => {
  it("tu, membri attuali per nome, poi usciti con netto ≠ 0", () => {
    const people: PersonNet[] = [
      { userId: "sara", name: "Sara", net: -10, isCurrentMember: true },
      { userId: "nic", name: "Nic", net: 40, isCurrentMember: true },
      { userId: "ada", name: "Ada", net: 0, isCurrentMember: true },
      { userId: "ex", name: "Ex", net: -30, isCurrentMember: false },
      { userId: "gone", name: "Gone", net: 0, isCurrentMember: false },
    ];
    expect(sortPersonNets(people, "nic").map((p) => p.userId)).toEqual([
      "nic",
      "ada",
      "sara",
      "ex",
    ]);
  });
});

describe("defaultReimbursement", () => {
  it("precompila verso il trasferimento in cui sei debitore più alto", () => {
    expect(
      defaultReimbursement(
        [
          { fromUserId: "nic", toUserId: "marco", amount: 10 },
          { fromUserId: "nic", toUserId: "sara", amount: 25 },
        ],
        "nic",
        ["marco", "nic", "sara"],
      ),
    ).toEqual({ fromUserId: "nic", toUserId: "sara", amount: 25 });
  });

  it("se non devi niente, altro membro per nome e importo vuoto", () => {
    expect(
      defaultReimbursement([], "nic", ["marco", "nic", "sara"]),
    ).toEqual({ fromUserId: "nic", toUserId: "marco", amount: null });
  });
});
