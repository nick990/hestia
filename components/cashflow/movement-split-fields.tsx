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
  disabled: boolean;
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
  disabled,
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
    splitMode === "equal" && movementAmount !== null && selectedMemberIds.length > 0
      ? splitEqual(movementAmount, selectedMemberIds, payerUserId)
      : [];

  const equalByUser = new Map(equalShares.map((share) => [share.userId, share.amount]));

  return (
    <div className={cn("space-y-3", disabled && "pointer-events-none opacity-50")}>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn("flex-1", splitMode === "equal" && "border-primary/30 bg-primary/10")}
          onClick={() => onSplitModeChange("equal")}
        >
          Parti uguali
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
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

          return (
            <div key={member.user_id} className="flex items-center gap-2">
              <Checkbox
                id={`split-member-${member.user_id}`}
                checked={checked}
                disabled={disabled}
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
                <span className="text-sm text-muted-foreground">
                  {formatEuro(equalAmount)}
                </span>
              ) : null}
              {checked && splitMode === "amount" ? (
                <Input
                  className="w-28"
                  inputMode="decimal"
                  disabled={disabled}
                  value={amountByUserId[member.user_id] ?? ""}
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
  );
}
