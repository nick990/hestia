import {
  computeNets,
  simplifyTransfers,
  type ExpenseForNets,
  type ReimbursementForNets,
} from "@/lib/saldi/balances";
import { sortPersonNets } from "@/lib/saldi/presentation";
import type {
  FamilySaldiMember,
  FamilySaldiSummary,
  PersonNet,
} from "@/lib/saldi/types";

export type BuildFamilySaldiSummaryInput = {
  familyId: string;
  currentMembers: FamilySaldiMember[];
  nameById: Record<string, string>;
  expenses: ExpenseForNets[];
  reimbursements: ReimbursementForNets[];
  currentUserId: string;
};

export function buildFamilySaldiSummary(
  input: BuildFamilySaldiSummaryInput,
): FamilySaldiSummary {
  const nets = computeNets(input.expenses, input.reimbursements);
  const transfers = simplifyTransfers(nets);

  const currentIds = new Set(
    input.currentMembers.map((member) => member.userId),
  );

  const personCandidates: PersonNet[] = [
    ...input.currentMembers.map((member) => ({
      userId: member.userId,
      name: member.name,
      net: nets.get(member.userId) ?? 0,
      isCurrentMember: true,
    })),
    ...[...nets.keys()]
      .filter((userId) => !currentIds.has(userId))
      .map((userId) => ({
        userId,
        name: input.nameById[userId] ?? "—",
        net: nets.get(userId) ?? 0,
        isCurrentMember: false,
      })),
  ];

  const personNets = sortPersonNets(personCandidates, input.currentUserId);

  const netsByUserId: Record<string, number> = {};
  for (const [userId, net] of nets) {
    netsByUserId[userId] = net;
  }

  return {
    familyId: input.familyId,
    currentMembers: input.currentMembers,
    nameById: input.nameById,
    netsByUserId,
    transfers,
    personNets,
  };
}
