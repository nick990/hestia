import type { CashflowView } from "@/lib/cashflow/view";
import type { Movement } from "@/lib/cashflow/types";

export type FamilyShareOptions = {
  shareEnabled: boolean;
  memberCount: number;
  view: CashflowView;
};

export function parseShareParam(value: string | undefined): boolean {
  return value === "1";
}

export function buildShareSearchParams(
  params: URLSearchParams,
  shareEnabled: boolean,
): URLSearchParams {
  const next = new URLSearchParams(params);
  if (shareEnabled) {
    next.set("share", "1");
  } else {
    next.delete("share");
  }
  return next;
}

export function isShareActive(
  view: CashflowView,
  shareEnabled: boolean,
): boolean {
  return shareEnabled && view !== "mine";
}

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function getEffectiveAmount(
  movement: Pick<Movement, "amount" | "scope">,
  options: FamilyShareOptions,
): number {
  if (!isShareActive(options.view, options.shareEnabled)) {
    return movement.amount;
  }

  if (movement.scope !== "family") {
    return movement.amount;
  }

  if (options.memberCount <= 0) {
    return movement.amount;
  }

  return roundMoney(movement.amount / options.memberCount);
}

export function applyShareToMovements(
  movements: Movement[],
  options: FamilyShareOptions,
): Movement[] {
  if (!isShareActive(options.view, options.shareEnabled)) {
    return movements;
  }

  return movements.map((movement) => ({
    ...movement,
    amount: getEffectiveAmount(movement, options),
  }));
}
