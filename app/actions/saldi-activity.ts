"use server";

import { getMovementById } from "@/lib/cashflow/queries";
import type { Movement } from "@/lib/cashflow/types";
import { listSaldiActivity } from "@/lib/saldi/queries";
import type { SaldiActivityItem } from "@/lib/saldi/types";

export async function loadSaldiActivityPage(offset: number): Promise<
  | { ok: true; items: SaldiActivityItem[]; hasMore: boolean }
  | { ok: false; error: string }
> {
  if (!Number.isInteger(offset) || offset < 0) {
    return { ok: false, error: "Non riesco a caricare altre righe." };
  }

  try {
    const page = await listSaldiActivity(offset);
    return { ok: true, ...page };
  } catch {
    return { ok: false, error: "Non riesco a caricare altre righe." };
  }
}

export async function loadSaldiMovement(id: string): Promise<Movement | null> {
  try {
    return await getMovementById(id);
  } catch {
    return null;
  }
}
