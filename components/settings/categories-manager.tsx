"use client";

import {
  createCategory,
  deleteCategory,
  renameCategoryPrefix,
  updateCategory,
} from "@/app/actions/categories";
import {
  buildSettingsCategoryRows,
  selectedExpandPaths,
  type SettingsCategoryRow,
} from "@/lib/categories/tree";
import type { MovementCategory } from "@/lib/categories/types";
import { cn } from "@/lib/utils";
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
import {
  ChevronDownIcon,
  ChevronRightIcon,
  MoreHorizontalIcon,
} from "lucide-react";
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
  const [editingPrefix, setEditingPrefix] = useState<string | null>(null);
  const [categoryToDelete, setCategoryToDelete] =
    useState<MovementCategory | null>(null);
  const [reassignToId, setReassignToId] = useState("");
  const [name, setName] = useState("");
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  const rows = useMemo(
    () => buildSettingsCategoryRows(categories, expanded, query),
    [categories, expanded, query],
  );

  const reassignOptions = useMemo(() => {
    if (!categoryToDelete) {
      return [];
    }

    return categories.filter((category) => category.id !== categoryToDelete.id);
  }, [categories, categoryToDelete]);

  const reassignSelectItems = useMemo(
    () =>
      reassignOptions.map((category) => ({
        value: category.id,
        label: category.name,
      })),
    [reassignOptions],
  );

  function resetForm() {
    setEditingCategory(null);
    setEditingPrefix(null);
    setName("");
  }

  function openCreateDialog() {
    resetForm();
    setDialogOpen(true);
  }

  function openCreateChild(path: string) {
    resetForm();
    setName(`${path}.`);
    setDialogOpen(true);
  }

  function openEditDialog(category: MovementCategory) {
    setEditingCategory(category);
    setEditingPrefix(null);
    setName(category.name);
    setDialogOpen(true);
  }

  function openEditPrefixDialog(prefix: string) {
    setEditingCategory(null);
    setEditingPrefix(prefix);
    setName(prefix);
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

  function toggleGroup(root: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(root)) {
        next.delete(root);
      } else {
        next.add(root);
      }
      return next;
    });
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    startTransition(async () => {
      const result = editingPrefix
        ? await renameCategoryPrefix(editingPrefix, name)
        : editingCategory
          ? await updateCategory(editingCategory.id, name)
          : await createCategory(name);

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success(
        editingPrefix || editingCategory
          ? "Categoria aggiornata."
          : "Categoria aggiunta.",
      );
      if (!editingPrefix && !editingCategory) {
        setExpanded(new Set(selectedExpandPaths(name)));
      }
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

  const editingName = editingPrefix ?? editingCategory?.name ?? null;
  const descendantCount = editingName
    ? categories.filter((category) =>
        category.name.startsWith(`${editingName}.`),
      ).length
    : 0;
  const isEditing = editingCategory !== null || editingPrefix !== null;

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
                  {isEditing ? "Modifica categoria" : "Aggiungi categoria"}
                </DialogTitle>
                <DialogDescription>
                  Il nome deve essere univoco (senza distinzione maiuscole/minuscole).
                  {descendantCount > 0
                    ? ` Cambiando il prefisso, ${descendantCount === 1 ? "si sposta anche la categoria sotto" : `si spostano anche le ${descendantCount} categorie sotto`}.`
                    : null}
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
                    {pending ? "Salvataggio…" : isEditing ? "Salva" : "Aggiungi"}
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
                  modal={false}
                  value={reassignToId}
                  items={reassignSelectItems}
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

      {categories.length > 0 ? (
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Cerca categoria"
          autoComplete="off"
          className="h-8"
        />
      ) : null}

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
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={canEdit ? 3 : 2}
                  className="py-8 text-center text-muted-foreground"
                >
                  Nessuna categoria trovata.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row, index) => {
                const stripe = siblingStripe(rows, index);
                const nest = nestNameClass(row.depth);
                const rowTint =
                  row.depth > 0
                    ? cn(
                        "bg-muted/15 hover:bg-muted/25",
                        stripe && "bg-muted/40 hover:bg-muted/40",
                      )
                    : undefined;

                if (row.kind === "group") {
                  const rootCategory = row.category;
                  return (
                    <TableRow key={`group-${row.path}`} className={rowTint}>
                      <TableCell
                        className={cn(
                          (row.depth === 0 || row.expandable) && "font-medium",
                        )}
                      >
                        <div className={cn("flex items-center gap-1", nest)}>
                          {row.expandable ? (
                            <button
                              type="button"
                              aria-expanded={row.open}
                              aria-label={
                                row.open
                                  ? `Chiudi ${row.label}`
                                  : `Apri ${row.label}`
                              }
                              onClick={() => toggleGroup(row.path)}
                              className="flex size-7 shrink-0 items-center justify-center text-muted-foreground"
                            >
                              {row.open ? (
                                <ChevronDownIcon className="size-3.5" />
                              ) : (
                                <ChevronRightIcon className="size-3.5" />
                              )}
                            </button>
                          ) : (
                            <span className="size-7 shrink-0" />
                          )}
                          <span
                            className={cn(!rootCategory && "text-muted-foreground")}
                          >
                            {row.label}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {rootCategory ? rootCategory.movement_count : "—"}
                      </TableCell>
                      {canEdit ? (
                        <TableCell className="text-right">
                          <CategoryActions
                            pending={pending}
                            onCreateChild={() => openCreateChild(row.path)}
                            onEdit={() =>
                              rootCategory
                                ? openEditDialog(rootCategory)
                                : openEditPrefixDialog(row.path)
                            }
                            onDelete={
                              rootCategory
                                ? () => openDeleteDialog(rootCategory)
                                : undefined
                            }
                          />
                        </TableCell>
                      ) : null}
                    </TableRow>
                  );
                }

                return (
                  <TableRow key={row.category.id} className={rowTint}>
                    <TableCell>
                      <div className={cn("flex items-center gap-1", nest)}>
                        <span className="pl-7">{row.label}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.category.movement_count}
                    </TableCell>
                    {canEdit ? (
                      <TableCell className="text-right">
                        <CategoryActions
                          pending={pending}
                          onCreateChild={() =>
                            openCreateChild(row.category.name)
                          }
                          onEdit={() => openEditDialog(row.category)}
                          onDelete={() => openDeleteDialog(row.category)}
                        />
                      </TableCell>
                    ) : null}
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

function siblingStripe(rows: SettingsCategoryRow[], index: number): boolean {
  const depth = rows[index].depth;
  if (depth === 0) {
    return false;
  }

  let count = 0;
  for (let i = index - 1; i >= 0; i--) {
    if (rows[i].depth < depth) {
      break;
    }
    if (rows[i].depth === depth) {
      count += 1;
    }
  }

  return count % 2 === 1;
}

function nestNameClass(depth: 0 | 1 | 2) {
  if (depth === 0) {
    return undefined;
  }

  return cn(
    "border-l-2 border-primary/25 bg-muted/25",
    depth === 1 && "ml-2.5 pl-2",
    depth === 2 && "ml-7 pl-2",
  );
}

function CategoryActions({
  pending,
  onCreateChild,
  onEdit,
  onDelete,
}: {
  pending: boolean;
  onCreateChild: () => void;
  onEdit: () => void;
  onDelete?: () => void;
}) {
  return (
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
        <DropdownMenuItem onClick={onCreateChild}>
          Aggiungi sotto
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onEdit}>Modifica</DropdownMenuItem>
        {onDelete ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={onDelete}>
              Elimina
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
