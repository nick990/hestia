import type { AssigneeKind } from "@/lib/cashflow/types";

export const ASSIGNEE_CHANGE_DENIED_MESSAGE =
  "Solo l'assegnatario può attivare o disattivare il flag privato.";

type AssigneeFields = {
  assignee_kind: AssigneeKind;
  assignee_user_id: string | null;
  is_private: boolean;
};

export function hasAssigneeChanged(
  existing: AssigneeFields,
  next: AssigneeFields,
): boolean {
  return (
    existing.assignee_kind !== next.assignee_kind ||
    existing.assignee_user_id !== next.assignee_user_id ||
    existing.is_private !== next.is_private
  );
}

export function isPrivateChangeAllowed(
  nextAssigneeUserId: string | null,
  currentUserId: string,
  existing: AssigneeFields,
  next: AssigneeFields,
): boolean {
  if (existing.is_private === next.is_private) {
    return true;
  }

  return nextAssigneeUserId === currentUserId;
}

export function canSetPrivate(
  assigneeUserId: string | null,
  currentUserId: string,
): boolean {
  return assigneeUserId === currentUserId;
}
