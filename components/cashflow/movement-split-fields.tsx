"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatEuro } from "@/lib/cashflow/format";
import type { FamilyMemberOption } from "@/lib/families/types";
import { splitEqual } from "@/lib/saldi/split";
import type { SplitMode } from "@/lib/saldi/types";
import { cn } from "@/lib/utils";

type MovementSplitFieldsProps = {
  familyMembers: FamilyMemberOption[];
  payerUserId: string;
  onPayerChange: (userId: string) => void;
  splitMode: SplitMode;
  onSplitModeChange: (mode: SplitMode) => void;
  selectedMemberIds: string[];
  onToggleMember: (userId: string, checked: boolean) => void;
  amountByUserId: Record<string, string>;
  onAmountChange: (userId: string, value: string) => void;
  movementAmount: number | null;
};

export function MovementSplitFields({
  familyMembers,
  payerUserId,
  onPayerChange,
  splitMode,
  onSplitModeChange,
  selectedMemberIds,
  onToggleMember,
  amountByUserId,
  onAmountChange,
  movementAmount,
}: MovementSplitFieldsProps) {
  const payerItems = familyMembers.map((member) => ({
    value: member.user_id,
    label: member.display_name,
  }));

  const equalShares =
    splitMode === "equal" && movementAmount !== null && selectedMemberIds.length > 0
      ? splitEqual(movementAmount, selectedMemberIds, payerUserId)
      : [];

  const equalByUser = new Map(equalShares.map((share) => [share.userId, share.amount]));

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="split-payer">Chi ha pagato</Label>
        <Select
          modal={false}
          value={payerUserId}
          items={payerItems}
          onValueChange={(value) => {
            if (value) {
              onPayerChange(value);
            }
          }}
        >
          <SelectTrigger id="split-payer" className="w-full">
            <SelectValue placeholder="Seleziona chi ha pagato" />
          </SelectTrigger>
          <SelectContent>
            {familyMembers.map((member) => (
              <SelectItem key={member.user_id} value={member.user_id}>
                {member.display_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          className={cn("flex-1", splitMode === "equal" && "border-primary/30 bg-primary/10")}
          onClick={() => onSplitModeChange("equal")}
        >
          Parti uguali
        </Button>
        <Button
          type="button"
          variant="outline"
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
