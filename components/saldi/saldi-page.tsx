"use client";

import {
  createReimbursement,
  deleteReimbursement,
  updateReimbursement,
} from "@/app/actions/reimbursements";
import {
  loadSaldiActivityPage,
  loadSaldiMovement,
} from "@/app/actions/saldi-activity";
import { MovementFormDialog } from "@/components/cashflow/movement-form-dialog";
import { DeleteReimbursementDialog } from "@/components/saldi/delete-reimbursement-dialog";
import { ReimbursementDialog } from "@/components/saldi/reimbursement-dialog";
import { SaldiActivityList } from "@/components/saldi/saldi-activity-list";
import { Button } from "@/components/ui/button";
import type { MovementCategoryOption } from "@/lib/categories/types";
import { getTodayIsoDate } from "@/lib/cashflow/date-range";
import { formatEuro } from "@/lib/cashflow/format";
import type { Movement } from "@/lib/cashflow/types";
import {
  computeNets,
  simplifyTransfers,
  transfersForUser,
} from "@/lib/saldi/balances";
import {
  defaultReimbursement,
  sortPersonNets,
  transferLine,
} from "@/lib/saldi/presentation";
import type {
  FamilySaldiNetsData,
  SaldiActivityItem,
} from "@/lib/saldi/types";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type SaldiPageProps = {
  currentUserId: string;
  data: FamilySaldiNetsData;
  initialActivity: SaldiActivityItem[];
  initialHasMore: boolean;
  categories: MovementCategoryOption[];
  defaultOccurredOn: string;
};

function formatNet(net: number): string {
  if (net > 0) {
    return `+${formatEuro(net)}`;
  }

  return formatEuro(net);
}

export function SaldiPage({
  currentUserId,
  data,
  initialActivity,
  initialHasMore,
  categories,
  defaultOccurredOn,
}: SaldiPageProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [reimburseOpen, setReimburseOpen] = useState(false);
  const [reimburseMode, setReimburseMode] = useState<"create" | "edit">("create");
  const [editingReimbursement, setEditingReimbursement] = useState<
    Extract<SaldiActivityItem, { kind: "reimbursement" }> | null
  >(null);
  const [deleting, setDeleting] = useState<{ id: string; amount: number } | null>(
    null,
  );
  const [editingMovement, setEditingMovement] = useState<Movement | null>(null);
  const [movementOpen, setMovementOpen] = useState(false);
  const [extraItems, setExtraItems] = useState<SaldiActivityItem[]>([]);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    setExtraItems([]);
    setHasMore(initialHasMore);
  }, [initialActivity, initialHasMore]);

  const items = useMemo(
    () => [...initialActivity, ...extraItems],
    [initialActivity, extraItems],
  );

  const nameById = useMemo(
    () => new Map(Object.entries(data.nameById)),
    [data.nameById],
  );

  const familyMembers = useMemo(
    () =>
      data.currentMembers.map((member) => ({
        user_id: member.userId,
        display_name: member.name,
      })),
    [data.currentMembers],
  );

  const { mine, people, defaults } = useMemo(() => {
    const nets = computeNets(data.expenses, data.reimbursements);
    const allTransfers = simplifyTransfers(nets);
    const mineTransfers = transfersForUser(allTransfers, currentUserId);
    const currentIds = new Set(data.currentMembers.map((member) => member.userId));
    const peopleNets = sortPersonNets(
      [
        ...data.currentMembers.map((member) => ({
          userId: member.userId,
          name: member.name,
          net: nets.get(member.userId) ?? 0,
          isCurrentMember: true,
        })),
        ...[...nets.keys()]
          .filter((userId) => !currentIds.has(userId))
          .map((userId) => ({
            userId,
            name: data.nameById[userId] ?? "—",
            net: nets.get(userId) ?? 0,
            isCurrentMember: false,
          })),
      ],
      currentUserId,
    );
    const memberIdsByName = [...data.currentMembers]
      .sort((a, b) => a.name.localeCompare(b.name, "it"))
      .map((member) => member.userId);

    return {
      mine: mineTransfers,
      people: peopleNets,
      defaults: defaultReimbursement(
        mineTransfers.filter((transfer) => transfer.fromUserId === currentUserId),
        currentUserId,
        memberIdsByName,
      ),
    };
  }, [currentUserId, data]);

  function refreshLists() {
    setExtraItems([]);
    router.refresh();
  }

  function handleCreate(input: {
    fromUserId: string;
    toUserId: string;
    amount: string;
    occurredOn: string;
  }) {
    startTransition(async () => {
      const result = await createReimbursement(input);

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success("Rimborso registrato.");
      setReimburseOpen(false);
      refreshLists();
    });
  }

  function handleUpdate(input: {
    fromUserId: string;
    toUserId: string;
    amount: string;
    occurredOn: string;
  }) {
    if (!editingReimbursement) {
      return;
    }

    const id = editingReimbursement.id;

    startTransition(async () => {
      const result = await updateReimbursement({ id, ...input });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success("Rimborso aggiornato.");
      setReimburseOpen(false);
      setEditingReimbursement(null);
      refreshLists();
    });
  }

  function handleDelete() {
    if (!deleting) {
      return;
    }

    const id = deleting.id;

    startTransition(async () => {
      const result = await deleteReimbursement(id);

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success("Rimborso eliminato.");
      setDeleting(null);
      setReimburseOpen(false);
      setEditingReimbursement(null);
      refreshLists();
    });
  }

  async function handleOpenSplit(id: string) {
    const movement = await loadSaldiMovement(id);

    if (!movement) {
      toast.error("Non trovo questo movimento.");
      return;
    }

    setEditingMovement(movement);
    setMovementOpen(true);
  }

  async function handleLoadMore() {
    if (loadingMore || !hasMore) {
      return;
    }

    setLoadingMore(true);
    const result = await loadSaldiActivityPage(items.length);

    if (!result.ok) {
      toast.error(result.error);
      setLoadingMore(false);
      return;
    }

    setExtraItems((current) => [...current, ...result.items]);
    setHasMore(result.hasMore);
    setLoadingMore(false);
  }

  return (
    <main className="mx-auto flex w-full flex-1 flex-col gap-8 px-4 py-4 sm:px-6">
      <section className="space-y-2">
        {mine.length === 0 ? (
          <p className="text-base">Sei in pari</p>
        ) : (
          <ul className="space-y-1">
            {mine.map((transfer) => (
              <li
                key={`${transfer.fromUserId}-${transfer.toUserId}-${transfer.amount}`}
                className="text-base"
              >
                {transferLine(transfer, currentUserId, nameById)}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <ul className="space-y-1">
          {people.map((person) => (
            <li
              key={person.userId}
              className="flex items-baseline justify-between gap-3"
            >
              <span>{person.name}</span>
              <span className="tabular-nums">{formatNet(person.net)}</span>
            </li>
          ))}
        </ul>
      </section>

      {data.currentMembers.length >= 2 ? (
        <div>
          <Button
            type="button"
            onClick={() => {
              setReimburseMode("create");
              setEditingReimbursement(null);
              setReimburseOpen(true);
            }}
          >
            Registra rimborso
          </Button>
        </div>
      ) : null}

      <SaldiActivityList
        items={items}
        nameById={data.nameById}
        hasMore={hasMore}
        loadingMore={loadingMore}
        onLoadMore={() => {
          void handleLoadMore();
        }}
        onOpenSplit={(id) => {
          void handleOpenSplit(id);
        }}
        onOpenReimbursement={(item) => {
          setReimburseMode("edit");
          setEditingReimbursement(item);
          setReimburseOpen(true);
        }}
      />

      <ReimbursementDialog
        open={reimburseOpen}
        mode={reimburseMode}
        members={data.currentMembers}
        today={getTodayIsoDate()}
        createDefaults={defaults}
        editing={
          editingReimbursement
            ? {
                fromUserId: editingReimbursement.fromUserId,
                toUserId: editingReimbursement.toUserId,
                amount: editingReimbursement.amount,
                occurredOn: editingReimbursement.occurredOn,
              }
            : null
        }
        pending={pending}
        onOpenChange={(open) => {
          setReimburseOpen(open);
          if (!open) {
            setEditingReimbursement(null);
            setReimburseMode("create");
          }
        }}
        onSubmit={reimburseMode === "edit" ? handleUpdate : handleCreate}
        onDelete={
          editingReimbursement
            ? () =>
                setDeleting({
                  id: editingReimbursement.id,
                  amount: editingReimbursement.amount,
                })
            : undefined
        }
      />
      <DeleteReimbursementDialog
        reimbursement={deleting}
        fromName={
          editingReimbursement
            ? (data.nameById[editingReimbursement.fromUserId] ?? "—")
            : "—"
        }
        toName={
          editingReimbursement
            ? (data.nameById[editingReimbursement.toUserId] ?? "—")
            : "—"
        }
        pending={pending}
        onOpenChange={(open) => {
          if (!open) {
            setDeleting(null);
          }
        }}
        onConfirm={handleDelete}
      />
      <MovementFormDialog
        open={movementOpen}
        onOpenChange={(open) => {
          setMovementOpen(open);
          if (!open) {
            setEditingMovement(null);
            refreshLists();
          }
        }}
        editingMovement={editingMovement}
        defaultOccurredOn={defaultOccurredOn}
        hasFamily
        currentUserId={currentUserId}
        familyMembers={familyMembers}
        categories={categories}
      />
    </main>
  );
}
