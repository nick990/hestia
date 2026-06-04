"use client";

import {
  createCategory,
  deleteCategory,
  updateCategory,
} from "@/app/actions/categories";
import type { MovementCategory } from "@/lib/categories/types";
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
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

type CategoriesManagerProps = {
  categories: MovementCategory[];
  canEdit: boolean;
};

export function CategoriesManager({
  categories,
  canEdit,
}: CategoriesManagerProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<MovementCategory | null>(
    null,
  );
  const [categoryToDelete, setCategoryToDelete] =
    useState<MovementCategory | null>(null);
  const [reassignToId, setReassignToId] = useState("");
  const [name, setName] = useState("");

  const reassignOptions = useMemo(() => {
    if (!categoryToDelete) {
      return [];
    }

    return categories.filter((category) => category.id !== categoryToDelete.id);
  }, [categories, categoryToDelete]);

  function resetForm() {
    setEditingCategory(null);
    setName("");
  }

  function openCreateDialog() {
    resetForm();
    setDialogOpen(true);
  }

  function openEditDialog(category: MovementCategory) {
    setEditingCategory(category);
    setName(category.name);
    setDialogOpen(true);
  }

  function handleDialogOpenChange(open: boolean) {
    setDialogOpen(open);

    if (!open) {
      resetForm();
    }
  }

  function openDeleteDialog(category: MovementCategory) {
    setCategoryToDelete(category);
    const alternatives = categories.filter((item) => item.id !== category.id);

    if (alternatives.length === 1) {
      setReassignToId(alternatives[0].id);
    } else {
      setReassignToId("");
    }
  }

  function closeDeleteDialog() {
    setCategoryToDelete(null);
    setReassignToId("");
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    startTransition(async () => {
      const result = editingCategory
        ? await updateCategory(editingCategory.id, name)
        : await createCategory(name);

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success(
        editingCategory ? "Categoria aggiornata." : "Categoria aggiunta.",
      );
      setDialogOpen(false);
      resetForm();
      router.refresh();
    });
  }

  function handleConfirmDelete() {
    if (!categoryToDelete) {
      return;
    }

    if (
      categoryToDelete.movement_count > 0 &&
      reassignOptions.length === 0
    ) {
      toast.error(
        "Crea un'altra categoria prima di eliminare questa.",
      );
      return;
    }

    if (categoryToDelete.movement_count > 0 && !reassignToId) {
      toast.error("Seleziona una categoria di destinazione.");
      return;
    }

    const id = categoryToDelete.id;
    const destinationId =
      categoryToDelete.movement_count > 0 ? reassignToId : null;

    startTransition(async () => {
      const result = await deleteCategory(id, destinationId);

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success("Categoria eliminata.");
      closeDeleteDialog();
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {canEdit ? (
        <div className="flex justify-end">
          <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
            <DialogTrigger render={<Button onClick={openCreateDialog} />}>
              Aggiungi categoria
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingCategory ? "Modifica categoria" : "Aggiungi categoria"}
                </DialogTitle>
                <DialogDescription>
                  Il nome deve essere univoco (senza distinzione maiuscole/minuscole).
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="category-name">Nome</Label>
                  <Input
                    id="category-name"
                    required
                    maxLength={100}
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                  />
                </div>
                <DialogFooter>
                  <DialogClose render={<Button type="button" variant="outline" />}>
                    Annulla
                  </DialogClose>
                  <Button type="submit" disabled={pending}>
                    {pending ? "Salvataggio…" : editingCategory ? "Salva" : "Aggiungi"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      ) : null}

      <Dialog
        open={categoryToDelete !== null}
        onOpenChange={(open) => {
          if (!open) {
            closeDeleteDialog();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Elimina categoria</DialogTitle>
            <DialogDescription>
              {categoryToDelete && categoryToDelete.movement_count > 0 ? (
                <>
                  {categoryToDelete.movement_count} movimenti usano{" "}
                  <span className="font-medium text-foreground">
                    {categoryToDelete.name}
                  </span>
                  . Scegli la categoria in cui spostarli prima di eliminare.
                </>
              ) : (
                <>
                  Stai per eliminare{" "}
                  <span className="font-medium text-foreground">
                    {categoryToDelete?.name}
                  </span>
                  . Questa azione è irreversibile.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {categoryToDelete && categoryToDelete.movement_count > 0 ? (
            reassignOptions.length === 0 ? (
              <p className="text-sm text-destructive">
                Crea un&apos;altra categoria prima di eliminare questa.
              </p>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="reassign-category">Sposta i movimenti in</Label>
                <Select
                  value={reassignToId}
                  onValueChange={(value) => setReassignToId(value ?? "")}
                >
                  <SelectTrigger id="reassign-category" className="w-full">
                    <SelectValue placeholder="Seleziona categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {reassignOptions.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={closeDeleteDialog}
            >
              Annulla
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={
                pending ||
                (categoryToDelete !== null &&
                  categoryToDelete.movement_count > 0 &&
                  (reassignOptions.length === 0 || !reassignToId))
              }
              onClick={handleConfirmDelete}
            >
              {pending ? "Eliminazione…" : "Elimina"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead className="text-right">Movimenti</TableHead>
              {canEdit ? (
                <TableHead className="w-12 text-right">Azioni</TableHead>
              ) : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={canEdit ? 3 : 2}
                  className="py-8 text-center text-muted-foreground"
                >
                  Nessuna categoria definita.
                </TableCell>
              </TableRow>
            ) : (
              categories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell className="font-medium">{category.name}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {category.movement_count}
                  </TableCell>
                  {canEdit ? (
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              disabled={pending}
                              aria-label="Azioni categoria"
                            />
                          }
                        >
                          <MoreHorizontalIcon />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => openEditDialog(category)}
                          >
                            Modifica
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => openDeleteDialog(category)}
                          >
                            Elimina
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
