"use client";

import {
  createReimbursement,
  deleteReimbursement,
} from "@/app/actions/reimbursements";
import { DeleteReimbursementDialog } from "@/components/saldi/delete-reimbursement-dialog";
import { ReimbursementDialog } from "@/components/saldi/reimbursement-dialog";
import { Button } from "@/components/ui/button";
import { formatEuro, formatOccurredOn } from "@/lib/cashflow/format";
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
import type { FamilySaldiData, FamilySaldiReimbursement } from "@/lib/saldi/types";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type SaldiPageProps = {
  currentUserId: string;
  data: FamilySaldiData;
};

function formatNet(net: number): string {
  if (net > 0) {
    return `+${formatEuro(net)}`;
  }

  return formatEuro(net);
}

export function SaldiPage({ currentUserId, data }: SaldiPageProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [reimburseOpen, setReimburseOpen] = useState(false);
  const [deleting, setDeleting] = useState<FamilySaldiReimbursement | null>(
    null,
  );

  const nameById = useMemo(
    () => new Map(Object.entries(data.nameById)),
    [data.nameById],
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

  function handleCreate(input: {
    fromUserId: string;
    toUserId: string;
    amount: string;
  }) {
    startTransition(async () => {
      const result = await createReimbursement(input);

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success("Rimborso registrato.");
      setReimburseOpen(false);
      router.refresh();
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
      router.refresh();
    });
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
          <Button type="button" onClick={() => setReimburseOpen(true)}>
            Registra rimborso
          </Button>
        </div>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-sm font-medium">Rimborsi</h2>
        {data.reimbursements.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nessun rimborso.</p>
        ) : (
          <ul className="space-y-3">
            {data.reimbursements.map((row) => {
              const fromName = data.nameById[row.fromUserId] ?? "—";
              const toName = data.nameById[row.toUserId] ?? "—";

              return (
                <li
                  key={row.id}
                  className="flex items-start justify-between gap-3"
                >
                  <div>
                    <p>
                      {fromName} ha rimborsato {formatEuro(row.amount)} a{" "}
                      {toName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatOccurredOn(row.createdAt.slice(0, 10))}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleting(row)}
                  >
                    Elimina
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <ReimbursementDialog
        open={reimburseOpen}
        members={data.currentMembers}
        defaultFromUserId={defaults.fromUserId}
        defaultToUserId={defaults.toUserId}
        defaultAmount={defaults.amount}
        pending={pending}
        onOpenChange={setReimburseOpen}
        onSubmit={handleCreate}
      />
      <DeleteReimbursementDialog
        reimbursement={deleting}
        fromName={deleting ? (data.nameById[deleting.fromUserId] ?? "—") : "—"}
        toName={deleting ? (data.nameById[deleting.toUserId] ?? "—") : "—"}
        pending={pending}
        onOpenChange={(open) => {
          if (!open) {
            setDeleting(null);
          }
        }}
        onConfirm={handleDelete}
      />
    </main>
  );
}
