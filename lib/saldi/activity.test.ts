import { describe, expect, it } from "vitest";
import {
  ACTIVITY_PAGE_SIZE,
  mergeSaldiActivity,
} from "@/lib/saldi/activity";
import type { SaldiActivityItem } from "@/lib/saldi/types";

function split(
  id: string,
  occurredOn: string,
  createdAt: string,
): SaldiActivityItem {
  return {
    kind: "split",
    id,
    occurredOn,
    createdAt,
    amount: 10,
    categoryName: "Spesa",
    description: "",
    payerName: "Nic",
  };
}

function reimburse(
  id: string,
  occurredOn: string,
  createdAt: string,
): SaldiActivityItem {
  return {
    kind: "reimbursement",
    id,
    occurredOn,
    createdAt,
    amount: 10,
    fromUserId: "sara",
    toUserId: "nic",
  };
}

describe("mergeSaldiActivity", () => {
  it("stesso giorno: rimborso prima se created_at è più recente", () => {
    const { items } = mergeSaldiActivity(
      [split("m1", "2026-09-06", "2026-09-06T08:00:00.000Z")],
      [reimburse("r1", "2026-09-06", "2026-09-06T12:00:00.000Z")],
      0,
    );

    expect(items.map((row) => row.id)).toEqual(["r1", "m1"]);
  });

  it("prima pagina ha 20 righe globali, seconda senza id duplicati", () => {
    const splits = Array.from({ length: 15 }, (_, i) =>
      split(`s${i}`, "2026-09-01", `2026-09-01T00:${String(i).padStart(2, "0")}:00.000Z`),
    );
    const reimbursements = Array.from({ length: 15 }, (_, i) =>
      reimburse(
        `r${i}`,
        "2026-09-02",
        `2026-09-02T00:${String(i).padStart(2, "0")}:00.000Z`,
      ),
    );

    const first = mergeSaldiActivity(splits, reimbursements, 0);
    const second = mergeSaldiActivity(splits, reimbursements, ACTIVITY_PAGE_SIZE);

    expect(first.items).toHaveLength(20);
    expect(first.hasMore).toBe(true);
    expect(second.items).toHaveLength(10);
    expect(second.hasMore).toBe(false);

    const ids = [...first.items, ...second.items].map((row) => row.id);
    expect(new Set(ids).size).toBe(30);
  });

  it("hasMore false sull'ultima pagina", () => {
    const { hasMore } = mergeSaldiActivity(
      [split("m1", "2026-09-01", "2026-09-01T00:00:00.000Z")],
      [],
      0,
    );
    expect(hasMore).toBe(false);
  });
});
