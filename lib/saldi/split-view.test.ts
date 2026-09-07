import { describe, expect, it } from "vitest";
import { inferCustomSplit } from "@/lib/saldi/persist";

describe("inferCustomSplit", () => {
  it("false: unica quota 100% pagante", () => {
    expect(
      inferCustomSplit({
        payerKind: "member",
        payerUserId: "nic",
        splitMode: "equal",
        shares: [{ userId: "nic", amount: 50 }],
        movementAmount: 50,
      }),
    ).toBe(false);
  });

  it("true: due membri", () => {
    expect(
      inferCustomSplit({
        payerKind: "member",
        payerUserId: "nic",
        splitMode: "equal",
        shares: [
          { userId: "nic", amount: 40 },
          { userId: "sara", amount: 40 },
        ],
        movementAmount: 80,
      }),
    ).toBe(true);
  });

  it("false: famiglia pagante", () => {
    expect(
      inferCustomSplit({
        payerKind: "family",
        payerUserId: null,
        splitMode: "equal",
        shares: [],
        movementAmount: 80,
      }),
    ).toBe(false);
  });
});
