"use server";

import { getMovementSplit } from "@/lib/saldi/queries";
import type { MovementSplitView } from "@/lib/saldi/types";

export async function loadMovementSplit(
  movementId: string,
): Promise<MovementSplitView | null> {
  return getMovementSplit(movementId);
}
