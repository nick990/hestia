"use client";

import {
  addMember,
  deleteMember,
  disableMember,
  enableMember,
  updateMemberRole,
} from "@/app/actions/members";
import type { MemberListItem, MemberRole } from "@/lib/auth/member";
import { Badge } from "@/components/ui/badge";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { MoreHorizontalIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

function getMemberStatus(member: MemberListItem) {
  if (member.disabled_at) {
    return { label: "Disabilitato", variant: "destructive" as const };
  }

  if (!member.auth_user_id) {
    return { label: "In attesa", variant: "secondary" as const };
  }

  return { label: "Attivo", variant: "default" as const };
}

function getDisplayName(member: MemberListItem) {
  return member.full_name ?? member.profile_full_name ?? "—";
}

function roleLabel(role: MemberRole) {
  return role === "admin" ? "Admin" : "User";
}

export function MembersManager({ members }: { members: MemberListItem[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<MemberRole>("user");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<MemberListItem | null>(
    null,
  );

  function handleAddMember(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    startTransition(async () => {
      const result = await addMember(email, role);

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success("Utente aggiunto.");
      setEmail("");
      setRole("user");
      setDialogOpen(false);
      router.refresh();
    });
  }

  function handleRoleChange(id: string, newRole: MemberRole) {
    startTransition(async () => {
      const result = await updateMemberRole(id, newRole);

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success("Ruolo aggiornato.");
      router.refresh();
    });
  }

  function handleDisable(id: string) {
    startTransition(async () => {
      const result = await disableMember(id);

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success("Utente disabilitato.");
      router.refresh();
    });
  }

  function handleEnable(id: string) {
    startTransition(async () => {
      const result = await enableMember(id);

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success("Utente riattivato.");
      router.refresh();
    });
  }

  function handleConfirmDelete() {
    if (!memberToDelete) {
      return;
    }

    const id = memberToDelete.id;

    startTransition(async () => {
      const result = await deleteMember(id);

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success("Utente eliminato definitivamente.");
      setMemberToDelete(null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          {members.length} utenti censiti
        </p>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<Button />}>Aggiungi utente</DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Aggiungi utente</DialogTitle>
              <DialogDescription>
                L&apos;utente potrà accedere con Google al primo login.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddMember} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="nome@dominio.it"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Ruolo</Label>
                <Select
                  modal={false}
                  value={role}
                  onValueChange={(value) => setRole(value as MemberRole)}
                >
                  <SelectTrigger id="role" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <DialogClose render={<Button type="button" variant="outline" />}>
                  Annulla
                </DialogClose>
                <Button type="submit" disabled={pending}>
                  {pending ? "Salvataggio…" : "Aggiungi"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog
        open={memberToDelete !== null}
        onOpenChange={(open) => {
          if (!open) {
            setMemberToDelete(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Elimina utente definitivamente</DialogTitle>
            <DialogDescription>
              Stai per eliminare{" "}
              <span className="font-medium text-foreground">
                {memberToDelete?.email}
              </span>
              . Questa azione è irreversibile.
              {memberToDelete?.auth_user_id
                ? " Verranno rimossi anche l'account di accesso e il profilo associato."
                : " L'utente non ha ancora effettuato il login."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => setMemberToDelete(null)}
            >
              Annulla
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={pending}
              onClick={handleConfirmDelete}
            >
              {pending ? "Eliminazione…" : "Elimina definitivamente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Ruolo</TableHead>
              <TableHead>Stato</TableHead>
              <TableHead className="w-12 text-right">Azioni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  Nessun utente censito.
                </TableCell>
              </TableRow>
            ) : (
              members.map((member) => {
                const status = getMemberStatus(member);

                return (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">{member.email}</TableCell>
                    <TableCell>{getDisplayName(member)}</TableCell>
                    <TableCell>
                      <Badge variant={member.role === "admin" ? "default" : "secondary"}>
                        {roleLabel(member.role)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              disabled={pending}
                              aria-label="Azioni utente"
                            />
                          }
                        >
                          <MoreHorizontalIcon />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {member.role === "user" ? (
                            <DropdownMenuItem
                              onClick={() => handleRoleChange(member.id, "admin")}
                            >
                              Promuovi ad admin
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() => handleRoleChange(member.id, "user")}
                            >
                              Degrada a user
                            </DropdownMenuItem>
                          )}
                          {member.disabled_at ? (
                            <DropdownMenuItem onClick={() => handleEnable(member.id)}>
                              Riattiva
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => handleDisable(member.id)}
                            >
                              Disabilita
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => setMemberToDelete(member)}
                          >
                            Elimina definitivamente
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
