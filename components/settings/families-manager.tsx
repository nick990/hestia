"use client";

import {
  addFamilyMember,
  createFamily,
  removeFamilyMember,
} from "@/app/actions/families";
import type {
  AssignableMember,
  FamilyWithMembers,
} from "@/lib/families/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

type FamiliesManagerProps = {
  families: FamilyWithMembers[];
  assignableMembers: AssignableMember[];
};

function memberLabel(member: AssignableMember) {
  return member.full_name?.trim()
    ? `${member.full_name} (${member.email})`
    : member.email;
}

export function FamiliesManager({
  families,
  assignableMembers,
}: FamiliesManagerProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [familyName, setFamilyName] = useState("");
  const [selectedFamilyId, setSelectedFamilyId] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");

  const availableMembers = useMemo(
    () => assignableMembers.filter((member) => !member.family_id),
    [assignableMembers],
  );

  const memberSelectItems = useMemo(
    () =>
      availableMembers.map((member) => ({
        value: member.auth_user_id,
        label: memberLabel(member),
      })),
    [availableMembers],
  );

  function handleCreateFamily(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    startTransition(async () => {
      const result = await createFamily(familyName);

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success("Famiglia creata.");
      setFamilyName("");
      setCreateDialogOpen(false);
      router.refresh();
    });
  }

  function handleAddMember(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedFamilyId || !selectedUserId) {
      toast.error("Seleziona famiglia e utente.");
      return;
    }

    startTransition(async () => {
      const result = await addFamilyMember(selectedFamilyId, selectedUserId);

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success("Membro aggiunto alla famiglia.");
      setSelectedUserId("");
      router.refresh();
    });
  }

  function handleRemoveMember(familyId: string, userId: string) {
    startTransition(async () => {
      const result = await removeFamilyMember(familyId, userId);

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success("Membro rimosso dalla famiglia.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          Crea famiglie e assegna utenti registrati per condividere i movimenti cashflow.
        </p>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger render={<Button />}>Crea famiglia</DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crea famiglia</DialogTitle>
              <DialogDescription>
                Assegna un nome alla famiglia. Potrai aggiungere i membri dopo.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateFamily} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="family-name">Nome</Label>
                <Input
                  id="family-name"
                  required
                  value={familyName}
                  onChange={(event) => setFamilyName(event.target.value)}
                  placeholder="Es. Rossi"
                />
              </div>
              <DialogFooter>
                <DialogClose render={<Button type="button" variant="outline" />}>
                  Annulla
                </DialogClose>
                <Button type="submit" disabled={pending}>
                  {pending ? "Creazione…" : "Crea"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {families.length > 0 ? (
        <form onSubmit={handleAddMember} className="flex flex-wrap items-end gap-3">
          <div className="space-y-2">
            <Label htmlFor="assign-family">Famiglia</Label>
            <Select
              value={selectedFamilyId}
              items={families.map((family) => ({
                value: family.id,
                label: family.name,
              }))}
              onValueChange={(value) => setSelectedFamilyId(value ?? "")}
            >
              <SelectTrigger id="assign-family" className="w-48">
                <SelectValue placeholder="Seleziona" />
              </SelectTrigger>
              <SelectContent>
                {families.map((family) => (
                  <SelectItem key={family.id} value={family.id}>
                    {family.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="assign-user">Utente</Label>
            <Select
              value={selectedUserId}
              items={memberSelectItems}
              onValueChange={(value) => setSelectedUserId(value ?? "")}
            >
              <SelectTrigger id="assign-user" className="min-w-56">
                <SelectValue placeholder="Seleziona utente" />
              </SelectTrigger>
              <SelectContent>
                {availableMembers.map((member) => (
                  <SelectItem key={member.auth_user_id} value={member.auth_user_id}>
                    {memberLabel(member)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={pending || availableMembers.length === 0}>
            Aggiungi membro
          </Button>
        </form>
      ) : null}

      {families.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          Nessuna famiglia creata.
        </p>
      ) : (
        <div className="space-y-6">
          {families.map((family) => (
            <div key={family.id} className="rounded-lg border">
              <div className="border-b px-4 py-3">
                <h3 className="font-medium">{family.name}</h3>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Utente</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="w-28 text-right">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {family.members.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={3}
                        className="py-6 text-center text-muted-foreground"
                      >
                        Nessun membro assegnato.
                      </TableCell>
                    </TableRow>
                  ) : (
                    family.members.map((member) => (
                      <TableRow key={member.user_id}>
                        <TableCell>{member.full_name ?? "—"}</TableCell>
                        <TableCell>{member.email}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={pending}
                            onClick={() =>
                              handleRemoveMember(family.id, member.user_id)
                            }
                          >
                            Rimuovi
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
