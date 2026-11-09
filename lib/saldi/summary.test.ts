import { describe, expect, it } from "vitest";
import {
  computeNets,
  simplifyTransfers,
  transfersForUser,
} from "@/lib/saldi/balances";
import { buildFamilySaldiSummary } from "@/lib/saldi/summary";

const NIC = "nic";
const SARA = "sara";

describe("buildFamilySaldiSummary", () => {
  it("allinea netti, trasferimenti e personNets al calcolo diretto", () => {
    const expenses = [
      {
        payerUserId: NIC,
        movementAmount: 80,
        shares: [
          { userId: NIC, amount: 40 },
          { userId: SARA, amount: 40 },
        ],
      },
    ];
    const reimbursements = [
      { fromUserId: SARA, toUserId: NIC, amount: 40 },
    ];

    const summary = buildFamilySaldiSummary({
      familyId: "fam-1",
      currentMembers: [
        { userId: NIC, name: "Nic" },
        { userId: SARA, name: "Sara" },
      ],
      nameById: { [NIC]: "Nic", [SARA]: "Sara" },
      expenses,
      reimbursements,
      currentUserId: NIC,
    });

    const nets = computeNets(expenses, reimbursements);
    expect(summary.netsByUserId).toEqual(Object.fromEntries(nets));
    expect(summary.transfers).toEqual(simplifyTransfers(nets));
    expect(transfersForUser(summary.transfers, NIC)).toHaveLength(0);
    expect(summary.personNets.map((person) => person.userId)).toEqual([
      NIC,
      SARA,
    ]);
    expect(summary.personNets.every((person) => person.net === 0)).toBe(true);
  });
});
