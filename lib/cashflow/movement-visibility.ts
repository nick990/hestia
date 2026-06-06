import type { MovementScope } from "@/lib/cashflow/types";

export const VISIBILITY_CHANGE_DENIED_MESSAGE =
  "Solo l'autore può cambiare la visibilità di questo movimento.";

type VisibilityFields = {
  scope: MovementScope;
  family_id: string | null;
};

export function hasVisibilityChanged(
  existing: VisibilityFields,
  next: VisibilityFields,
): boolean {
  return existing.scope !== next.scope || existing.family_id !== next.family_id;
}

export function isVisibilityChangeAllowed(
  authorId: string,
  currentUserId: string,
  visibilityChanged: boolean,
): boolean {
  if (!visibilityChanged) {
    return true;
  }

  return authorId === currentUserId;
}
