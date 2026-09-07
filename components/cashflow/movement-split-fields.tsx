"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatEuro } from "@/lib/cashflow/format";
import type { FamilyMemberOption } from "@/lib/families/types";
import { splitEqual } from "@/lib/saldi/split";
import type { SplitMode } from "@/lib/saldi/types";
import { cn } from "@/lib/utils";

type MovementSplitFieldsProps = {
  familyMembers: FamilyMemberOption[];
  readOnly?: boolean;
  splitMode: SplitMode;
  onSplitModeChange: (mode: SplitMode) => void;
  selectedMemberIds: string[];
  onToggleMember: (userId: string, checked: boolean) => void;
  amountByUserId: Record<string, string>;
  onAmountChange: (userId: string, value: string) => void;
  movementAmount: number | null;
  payerUserId: string;
};

export function MovementSplitFields({
  familyMembers,
  readOnly = false,
  splitMode,
  onSplitModeChange,
  selectedMemberIds,
  onToggleMember,
  amountByUserId,
  onAmountChange,
  movementAmount,
  payerUserId,
}: MovementSplitFieldsProps) {
  const equalShares =
    movementAmount !== null && selectedMemberIds.length > 0
      ? splitEqual(movementAmount, selectedMemberIds, payerUserId)
      : [];

  const equalByUser = new Map(equalShares.map((share) => [share.userId, share.amount]));

  return (
    <div className="relative">
      <div
        className={cn(
          "space-y-3",
          readOnly && "pointer-events-none select-none opacity-80",
        )}
      >
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={readOnly}
            className={cn("flex-1", splitMode === "equal" && "border-primary/30 bg-primary/10")}
            onClick={() => onSplitModeChange("equal")}
          >
            Parti uguali
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={readOnly}
            className={cn("flex-1", splitMode === "amount" && "border-primary/30 bg-primary/10")}
            onClick={() => onSplitModeChange("amount")}
          >
            Per importo
          </Button>
        </div>
        <div className="space-y-2">
          {familyMembers.map((member) => {
            const checked = selectedMemberIds.includes(member.user_id);
            const equalAmount = equalByUser.get(member.user_id);
            const amountDisplay =
              amountByUserId[member.user_id] ??
              (equalAmount !== undefined
                ? String(equalAmount).replace(".", ",")
                : "");

            return (
              <div key={member.user_id} className="flex items-center gap-2">
                <Checkbox
                  id={`split-member-${member.user_id}`}
                  checked={checked}
                  disabled={readOnly}
                  onCheckedChange={(value) =>
                    onToggleMember(member.user_id, value === true)
                  }
                />
                <Label
                  htmlFor={`split-member-${member.user_id}`}
                  className="min-w-0 flex-1 font-normal"
                >
                  {member.display_name}
                </Label>
                {checked && splitMode === "equal" && equalAmount !== undefined ? (
                  <span className="text-sm whitespace-nowrap text-muted-foreground tabular-nums">
                    {formatEuro(equalAmount)}
                  </span>
                ) : null}
                {checked && splitMode === "amount" ? (
                  <Input
                    className="w-28"
                    inputMode="decimal"
                    disabled={readOnly}
                    value={amountDisplay}
                    onChange={(event) =>
                      onAmountChange(member.user_id, event.target.value)
                    }
                    placeholder="0,00"
                  />
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
      {readOnly ? (
        <div
          className="absolute inset-0 z-10 rounded-lg bg-background/45"
          aria-hidden="true"
        />
      ) : null}
    </div>
  );
}
