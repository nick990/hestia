import {
  getCurrentUserFamily,
  listFamilyMembersForViewer,
} from "@/lib/families/queries";
import {
  ACTIVITY_PAGE_SIZE,
  compareSaldiActivityDesc,
  mergeSaldiActivity,
} from "@/lib/saldi/activity";
import type {
  FamilySaldiNetsData,
  MaterializedShare,
  MovementSplitView,
  SaldiActivityItem,
} from "@/lib/saldi/types";
import { createClient } from "@/lib/supabase/server";

type ProfileRow = {
  id: string;
  full_name: string | null;
  email: string;
};

type NetPaymentRow = {
  payer_user_id: string;
  movements:
    | { amount: number | string; type: string; is_private: boolean }
    | { amount: number | string; type: string; is_private: boolean }[]
    | null;
  movement_payment_shares:
    | { user_id: string; amount: number | string }[]
    | null;
};

type NetReimbursementRow = {
  from_user_id: string;
  to_user_id: string;
  amount: number | string;
};

type ActivityMovement = {
  amount: number | string;
  type: string;
  is_private: boolean;
  occurred_on: string;
  created_at: string;
  description: string;
  movement_categories: { name: string } | { name: string }[] | null;
};

type ActivityPaymentRow = {
  movement_id: string;
  payer_user_id: string;
  movements: ActivityMovement | ActivityMovement[] | null;
};

type ActivityReimbursementRow = {
  id: string;
  from_user_id: string;
  to_user_id: string;
  amount: number | string;
  occurred_on: string;
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

function isUsableExpense<T extends { type: string; is_private: boolean }>(
  movement: T | null,
): movement is T {
  return movement !== null && movement.type === "expense" && !movement.is_private;
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

function categoryNameOf(
  relation: ActivityMovement["movement_categories"],
): string | null {
  if (!relation) {
    return null;
  }

  return Array.isArray(relation) ? (relation[0]?.name ?? null) : relation.name;
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

export async function listFamilyNets(): Promise<FamilySaldiNetsData | null> {
  const family = await getCurrentUserFamily();

  if (!family) {
    return null;
  }

  const supabase = await createClient();
  const [paymentsResult, reimbursementsResult, currentMembers] =
    await Promise.all([
      supabase
        .from("movement_payments")
        .select(
          "payer_user_id, movements(amount, type, is_private), movement_payment_shares(user_id, amount)",
        )
        .eq("family_id", family.family_id),
      supabase
        .from("reimbursements")
        .select("from_user_id, to_user_id, amount")
        .eq("family_id", family.family_id),
      listFamilyMembersForViewer(),
    ]);

  if (paymentsResult.error) {
    throw new Error(paymentsResult.error.message);
  }

  if (reimbursementsResult.error) {
    throw new Error(reimbursementsResult.error.message);
  }

  const expenses = ((paymentsResult.data ?? []) as NetPaymentRow[]).flatMap(
    (row) => {
      const movement = unwrapRelation(row.movements);

      if (!isUsableExpense(movement)) {
        return [];
      }

      return [
        {
          payerUserId: row.payer_user_id,
          movementAmount: Number(movement.amount),
          shares: mapShares(row.movement_payment_shares),
        },
      ];
    },
  );

  const reimbursements = (
    (reimbursementsResult.data ?? []) as NetReimbursementRow[]
  ).map((row) => ({
    fromUserId: row.from_user_id,
    toUserId: row.to_user_id,
    amount: Number(row.amount),
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

export async function listSaldiActivity(
  offset: number,
): Promise<{ items: SaldiActivityItem[]; hasMore: boolean }> {
  const family = await getCurrentUserFamily();

  if (!family) {
    return { items: [], hasMore: false };
  }

  const take = offset + ACTIVITY_PAGE_SIZE + 1;
  const supabase = await createClient();

  const [paymentsResult, reimbursementsResult] = await Promise.all([
    supabase
      .from("movement_payments")
      .select(
        "movement_id, payer_user_id, movements(amount, type, is_private, occurred_on, created_at, description, movement_categories(name))",
      )
      .eq("family_id", family.family_id),
    supabase
      .from("reimbursements")
      .select("id, from_user_id, to_user_id, amount, occurred_on, created_at")
      .eq("family_id", family.family_id)
      .order("occurred_on", { ascending: false })
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(0, take - 1),
  ]);

  if (paymentsResult.error) {
    throw new Error(paymentsResult.error.message);
  }

  if (reimbursementsResult.error) {
    throw new Error(reimbursementsResult.error.message);
  }

  const paymentRows = (paymentsResult.data ?? []) as ActivityPaymentRow[];
  const splits: SaldiActivityItem[] = [];
  const payerByMovementId = new Map<string, string>();

  for (const row of paymentRows) {
    const movement = unwrapRelation(row.movements);

    if (!isUsableExpense(movement)) {
      continue;
    }

    payerByMovementId.set(row.movement_id, row.payer_user_id);
    splits.push({
      kind: "split",
      id: row.movement_id,
      occurredOn: movement.occurred_on,
      createdAt: movement.created_at,
      amount: Number(movement.amount),
      categoryName: categoryNameOf(movement.movement_categories),
      description: movement.description,
      payerName: "",
    });
  }

  splits.sort(compareSaldiActivityDesc);
  const splitPage = splits.slice(0, take);
  const payerNames = await loadProfileNames(
    supabase,
    [
      ...new Set(
        splitPage.map((row) => payerByMovementId.get(row.id) ?? ""),
      ),
    ].filter(Boolean),
  );
  const splitsWithPayer = splitPage.map((row) => ({
    ...row,
    payerName: payerNames.get(payerByMovementId.get(row.id) ?? "") ?? "—",
  }));

  const reimbursements: SaldiActivityItem[] = (
    (reimbursementsResult.data ?? []) as ActivityReimbursementRow[]
  ).map((row) => ({
    kind: "reimbursement",
    id: row.id,
    occurredOn: row.occurred_on,
    createdAt: row.created_at,
    amount: Number(row.amount),
    fromUserId: row.from_user_id,
    toUserId: row.to_user_id,
  }));

  return mergeSaldiActivity(splitsWithPayer, reimbursements, offset);
}
