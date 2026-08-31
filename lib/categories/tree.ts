import type { MovementCategoryOption } from "@/lib/categories/types";

export type CategoryChildRow = {
  id: string;
  name: string;
  label: string;
};

export type CategoryGroup = {
  root: string;
  rootCategory: MovementCategoryOption | null;
  children: CategoryChildRow[];
};

export function compareItalian(a: string, b: string): number {
  return a.localeCompare(b, "it", { sensitivity: "base" });
}

export function firstSegment(name: string): string {
  return name.split(".")[0] ?? name;
}

export function relativeLabel(name: string, root: string): string {
  const prefix = `${root}.`;
  return name.startsWith(prefix) ? name.slice(prefix.length) : name;
}

export function buildCategoryGroups(
  categories: MovementCategoryOption[],
): CategoryGroup[] {
  const byRoot = new Map<string, MovementCategoryOption[]>();

  for (const category of categories) {
    const root = firstSegment(category.name);
    if (!root) {
      continue;
    }

    const list = byRoot.get(root) ?? [];
    list.push(category);
    byRoot.set(root, list);
  }

  const groups: CategoryGroup[] = [];

  for (const [root, items] of byRoot) {
    const rootCategory = items.find((item) => item.name === root) ?? null;
    const children = items
      .filter((item) => item.name.startsWith(`${root}.`))
      .map((item) => ({
        id: item.id,
        name: item.name,
        label: relativeLabel(item.name, root),
      }))
      .sort((a, b) => compareItalian(a.label, b.label));

    groups.push({ root, rootCategory, children });
  }

  groups.sort((a, b) => compareItalian(a.root, b.root));
  return groups;
}

export function matchesCategoryQuery(name: string, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return true;
  }

  return name.toLowerCase().includes(needle);
}

export function filterCategoryGroups(
  groups: CategoryGroup[],
  query: string,
): CategoryGroup[] {
  if (!query.trim()) {
    return groups;
  }

  const next: CategoryGroup[] = [];

  for (const group of groups) {
    const rootName = group.rootCategory?.name ?? group.root;
    const rootMatches = matchesCategoryQuery(rootName, query);
    const children = group.children.filter((child) =>
      matchesCategoryQuery(child.name, query),
    );

    if (!rootMatches && children.length === 0) {
      continue;
    }

    next.push({ ...group, children });
  }

  return next;
}

export function showNoneOption(query: string): boolean {
  return matchesCategoryQuery("nessuna", query);
}

export function categoryTriggerLabel(
  categories: MovementCategoryOption[],
  categoryId: string,
): string {
  if (categoryId === "none") {
    return "Nessuna";
  }

  return (
    categories.find((category) => category.id === categoryId)?.name ?? "Nessuna"
  );
}

export function selectedGroupRoot(
  categories: MovementCategoryOption[],
  categoryId: string,
): string | null {
  if (categoryId === "none") {
    return null;
  }

  const found = categories.find((category) => category.id === categoryId);
  return found ? firstSegment(found.name) : null;
}
