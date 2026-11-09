"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { isoDateToLocal, localDateToIso } from "@/lib/cashflow/date-range";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { useState } from "react";

type FilterDatePickerProps = {
  id: string;
  label: string;
  value: string;
  disabled?: boolean;
  onCommit: (iso: string) => void;
};

export function FilterDatePicker({
  id,
  label,
  value,
  disabled,
  onCommit,
}: FilterDatePickerProps) {
  const [open, setOpen] = useState(false);
  const selected = isoDateToLocal(value);

  return (
    <div className="flex items-center gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              id={id}
              type="button"
              variant="outline"
              disabled={disabled}
              className={cn(
                "w-[9.5rem] justify-start gap-2 px-2.5 font-normal",
              )}
            />
          }
        >
          <CalendarIcon className="size-4 shrink-0 opacity-60" />
          <span className="truncate">
            {format(selected, "d MMM yyyy", { locale: it })}
          </span>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            locale={it}
            defaultMonth={selected}
            selected={selected}
            onSelect={(date) => {
              if (!date) {
                return;
              }
              const iso = localDateToIso(date);
              if (iso === value) {
                setOpen(false);
                return;
              }
              onCommit(iso);
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
