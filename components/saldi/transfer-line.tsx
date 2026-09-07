import { transferLineParts } from "@/lib/saldi/presentation";
import type { Transfer } from "@/lib/saldi/types";
import { cn } from "@/lib/utils";

type TransferLineProps = {
  transfer: Transfer;
  currentUserId: string;
  nameById: Map<string, string>;
};

export function TransferLine({
  transfer,
  currentUserId,
  nameById,
}: TransferLineProps) {
  const parts = transferLineParts(transfer, currentUserId, nameById);

  return (
    <>
      {parts.before}
      <span
        className={cn(
          "whitespace-nowrap tabular-nums",
          parts.tone === "debit" ? "text-destructive" : "text-income",
        )}
      >
        {parts.amount}
      </span>
      {parts.after}
    </>
  );
}
