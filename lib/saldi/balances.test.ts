import { describe, expect, it } from "vitest";
import {
  computeNets,
  simplifyTransfers,
  transfersForUser,
} from "@/lib/saldi/balances";

const NIC = "nic";
const SARA = "sara";
const MARCO = "marco";

describe("computeNets", () => {
  it("uscita 80 € pagata da Nic, metà e metà", () => {
    const nets = computeNets(
      [
        {
          payerUserId: NIC,
          movementAmount: 80,
          shares: [
            { userId: NIC, amount: 40 },
            { userId: SARA, amount: 40 },
          ],
        },
      ],
      [],
    );
    expect(nets.get(NIC)).toBe(40);
    expect(nets.get(SARA)).toBe(-40);
  });

  it("90 € in tre, Nic paga → Nic +60", () => {
    const nets = computeNets(
      [
        {
          payerUserId: NIC,
          movementAmount: 90,
          shares: [
            { userId: NIC, amount: 30 },
            { userId: SARA, amount: 30 },
            { userId: MARCO, amount: 30 },
          ],
        },
      ],
      [],
    );
    expect(nets.get(NIC)).toBe(60);
    expect(nets.get(SARA)).toBe(-30);
    expect(nets.get(MARCO)).toBe(-30);
  });

  it("un solo spuntato = pagante → netti zero", () => {
    const nets = computeNets(
      [
        {
          payerUserId: NIC,
          movementAmount: 50,
          shares: [{ userId: NIC, amount: 50 }],
        },
      ],
      [],
    );
    expect(nets.get(NIC) ?? 0).toBe(0);
  });

  it("pagante non tra gli spuntati", () => {
    const nets = computeNets(
      [
        {
          payerUserId: NIC,
          movementAmount: 80,
          shares: [{ userId: SARA, amount: 80 }],
        },
      ],
      [],
    );
    expect(nets.get(NIC)).toBe(80);
    expect(nets.get(SARA)).toBe(-80);
  });

  it("rimborso Sara → Nic 40 azzera la coppia", () => {
    const nets = computeNets(
      [
        {
          payerUserId: NIC,
          movementAmount: 80,
          shares: [
            { userId: NIC, amount: 40 },
            { userId: SARA, amount: 40 },
          ],
        },
      ],
      [{ fromUserId: SARA, toUserId: NIC, amount: 40 }],
    );
    expect(nets.get(NIC) ?? 0).toBe(0);
    expect(nets.get(SARA) ?? 0).toBe(0);
  });
});

describe("simplifyTransfers", () => {
  it("Nic +50, Sara −20, Marco −30 → due pagamenti a Nic", () => {
    const nets = new Map([
      [NIC, 50],
      [SARA, -20],
      [MARCO, -30],
    ]);
    const transfers = simplifyTransfers(nets);
    expect(transfers).toEqual([
      { fromUserId: MARCO, toUserId: NIC, amount: 30 },
      { fromUserId: SARA, toUserId: NIC, amount: 20 },
    ]);
  });

  it("Sara loggata vede solo il suo trasferimento", () => {
    const transfers = simplifyTransfers(
      new Map([
        [NIC, 50],
        [SARA, -20],
        [MARCO, -30],
      ]),
    );
    expect(transfersForUser(transfers, SARA)).toEqual([
      { fromUserId: SARA, toUserId: NIC, amount: 20 },
    ]);
    expect(transfersForUser(transfers, NIC)).toHaveLength(2);
  });
});
