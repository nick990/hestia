import { describe, expect, it } from "vitest";
import {
  ACTIVITY_PAGE_SIZE,
  activitySortFields,
  isReimbursementVisibleInActivity,
  isSplitVisibleInActivity,
  mergeSaldiActivity,
} from "@/lib/saldi/activity";
import type { Movement } from "@/lib/cashflow/types";
import type { SaldiActivityItem } from "@/lib/saldi/types";

function sampleMovement(
  id: string,
  occurredOn: string,
  createdAt: string,
): Movement {
  return {
    id,
    type: "expense",
    amount: 10,
    occurred_on: occurredOn,
    description: "",
    created_at: createdAt,
    category_id: null,
    category_name: "Spesa",
    created_by: "nic",
    assignee_kind: "family",
    assignee_user_id: null,
    is_private: false,
    creator_name: null,
    assignee_name: "Famiglia",
    payer_name: "Nic",
  };
}

function split(
  id: string,
  occurredOn: string,
  createdAt: string,
): SaldiActivityItem {
  return {
    kind: "split",
    createdAt,
    movement: sampleMovement(id, occurredOn, createdAt),
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

describe("isSplitVisibleInActivity", () => {
  const NIC = "nic";
  const SARA = "sara";
  const MARCO = "marco";

  it("nasconde solo pagante spuntato", () => {
    expect(isSplitVisibleInActivity(NIC, [NIC], NIC)).toBe(false);
  });

  it("mostra ripartizione tra due che include l'utente", () => {
    expect(isSplitVisibleInActivity(NIC, [NIC, SARA], NIC)).toBe(true);
  });

  it("mostra pagante non spuntato se coinvolge l'utente", () => {
    expect(isSplitVisibleInActivity(NIC, [SARA], NIC)).toBe(true);
  });

  it("nasconde ripartizione tra altri", () => {
    expect(isSplitVisibleInActivity(MARCO, [MARCO, SARA], NIC)).toBe(false);
  });
});

describe("isReimbursementVisibleInActivity", () => {
  it("mostra se l'utente dà o riceve", () => {
    expect(isReimbursementVisibleInActivity("nic", "sara", "nic")).toBe(true);
    expect(isReimbursementVisibleInActivity("sara", "nic", "nic")).toBe(true);
  });

  it("nasconde se l'utente non c'entra", () => {
    expect(isReimbursementVisibleInActivity("marco", "sara", "nic")).toBe(
      false,
    );
  });
});

describe("mergeSaldiActivity", () => {
  it("stesso giorno: rimborso prima se created_at è più recente", () => {
    const { items } = mergeSaldiActivity(
      [split("m1", "2026-09-06", "2026-09-06T08:00:00.000Z")],
      [reimburse("r1", "2026-09-06", "2026-09-06T12:00:00.000Z")],
      0,
    );

    expect(items.map((row) => activitySortFields(row).id)).toEqual(["r1", "m1"]);
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

    const ids = [...first.items, ...second.items].map(
      (row) => activitySortFields(row).id,
    );
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
