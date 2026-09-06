import {
  getCurrentUserFamily,
  listFamilyMembersForViewer,
} from "@/lib/families/queries";
import type {
  FamilySaldiData,
  MaterializedShare,
  MovementSplitView,
} from "@/lib/saldi/types";
import { createClient } from "@/lib/supabase/server";

type ProfileRow = {
  id: string;
  full_name: string | null;
  email: string;
};

type PaymentRow = {
  payer_user_id: string;
  split_mode: "equal" | "amount";
  movements:
    | { amount: number | string; type: string; is_private: boolean }
    | { amount: number | string; type: string; is_private: boolean }[]
    | null;
  movement_payment_shares:
    | { user_id: string; amount: number | string }[]
    | null;
};

type ReimbursementRow = {
  id: string;
  from_user_id: string;
  to_user_id: string;
  amount: number | string;
  created_at: string;
};

function displayName(profile: ProfileRow | undefined): string {
  if (!profile) {
    return "—";
  }

  return profile.full_name?.trim() || profile.email;
}

function unwrapRelation<T>(value: T | T[] | null): T | null {
  if (!value) {
    return null;
  }

  return Array.isArray(value) ? (value[0] ?? null) : value;
}

async function loadProfileNames(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userIds: string[],
): Promise<Map<string, string>> {
  const unique = [...new Set(userIds.filter(Boolean))];

  if (unique.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .in("id", unique);

  if (error) {
    throw new Error(error.message);
  }

  return new Map(
    (data ?? []).map((profile: ProfileRow) => [profile.id, displayName(profile)]),
  );
}

function mapShares(
  rows: { user_id: string; amount: number | string }[] | null,
): MaterializedShare[] {
  return (rows ?? []).map((row) => ({
    userId: row.user_id,
    amount: Number(row.amount),
  }));
}

export async function getMovementSplit(
  movementId: string,
): Promise<MovementSplitView | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("movement_payments")
    .select("payer_user_id, split_mode, movement_payment_shares(user_id, amount)")
    .eq("movement_id", movementId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  const row = data as {
    payer_user_id: string;
    split_mode: "equal" | "amount";
    movement_payment_shares: { user_id: string; amount: number | string }[] | null;
  };

  return {
    payerUserId: row.payer_user_id,
    splitMode: row.split_mode,
    shares: mapShares(row.movement_payment_shares),
  };
}

export async function listFamilySaldiData(): Promise<FamilySaldiData | null> {
  const family = await getCurrentUserFamily();

  if (!family) {
    return null;
  }

  const supabase = await createClient();
  const [paymentsResult, reimbursementsResult, currentMembers] = await Promise.all([
    supabase
      .from("movement_payments")
      .select(
        "payer_user_id, split_mode, movements(amount, type, is_private), movement_payment_shares(user_id, amount)",
      )
      .eq("family_id", family.family_id),
    supabase
      .from("reimbursements")
      .select("id, from_user_id, to_user_id, amount, created_at")
      .eq("family_id", family.family_id)
      .order("created_at", { ascending: false }),
    listFamilyMembersForViewer(),
  ]);

  if (paymentsResult.error) {
    throw new Error(paymentsResult.error.message);
  }

  if (reimbursementsResult.error) {
    throw new Error(reimbursementsResult.error.message);
  }

  const paymentRows = (paymentsResult.data ?? []) as PaymentRow[];
  const reimbursementRows = (reimbursementsResult.data ?? []) as ReimbursementRow[];

  const expenses = paymentRows.flatMap((row) => {
    const movement = unwrapRelation(row.movements);

    if (!movement || movement.type !== "expense" || movement.is_private) {
      return [];
    }

    return [
      {
        payerUserId: row.payer_user_id,
        movementAmount: Number(movement.amount),
        shares: mapShares(row.movement_payment_shares),
      },
    ];
  });

  const reimbursements = reimbursementRows.map((row) => ({
    id: row.id,
    fromUserId: row.from_user_id,
    toUserId: row.to_user_id,
    amount: Number(row.amount),
    createdAt: row.created_at,
  }));

  const userIds = [
    ...currentMembers.map((member) => member.user_id),
    ...expenses.flatMap((expense) => [
      expense.payerUserId,
      ...expense.shares.map((share) => share.userId),
    ]),
    ...reimbursements.flatMap((row) => [row.fromUserId, row.toUserId]),
  ];

  const names = await loadProfileNames(supabase, userIds);
  const nameById: Record<string, string> = {};

  for (const member of currentMembers) {
    nameById[member.user_id] = member.display_name;
  }

  for (const [userId, name] of names) {
    if (!nameById[userId]) {
      nameById[userId] = name;
    }
  }

  return {
    familyId: family.family_id,
    expenses,
    reimbursements,
    currentMembers: currentMembers.map((member) => ({
      userId: member.user_id,
      name: member.display_name,
    })),
    nameById,
  };
}
