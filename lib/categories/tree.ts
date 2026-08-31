import type {
  MovementCategory,
  MovementCategoryOption,
} from "@/lib/categories/types";

export type CategoryChildRow = {
  id: string;
  name: string;
  label: string;
};

export type CategoryLevel2 = {
  segment: string;
  path: string;
  category: MovementCategoryOption | null;
  children: CategoryChildRow[];
};

export type CategoryGroup = {
  root: string;
  rootCategory: MovementCategoryOption | null;
  children: CategoryLevel2[];
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

export function selectedExpandPaths(name: string): string[] {
  const parts = name.split(".").filter(Boolean);
  if (parts.length === 0) {
    return [];
  }

  const paths = [parts[0]];
  if (parts.length >= 2) {
    paths.push(`${parts[0]}.${parts[1]}`);
  }

  return paths;
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
    const bySecond = new Map<string, MovementCategoryOption[]>();

    for (const item of items) {
      if (!item.name.startsWith(`${root}.`)) {
        continue;
      }

      const segment = relativeLabel(item.name, root).split(".")[0] ?? "";
      if (!segment) {
        continue;
      }

      const list = bySecond.get(segment) ?? [];
      list.push(item);
      bySecond.set(segment, list);
    }

    const children: CategoryLevel2[] = [];

    for (const [segment, l2Items] of bySecond) {
      const path = `${root}.${segment}`;
      const category = l2Items.find((item) => item.name === path) ?? null;
      const grandchildren = l2Items
        .filter((item) => item.name.startsWith(`${path}.`))
        .map((item) => ({
          id: item.id,
          name: item.name,
          label: relativeLabel(item.name, path),
        }))
        .sort((a, b) => compareItalian(a.label, b.label));

      children.push({ segment, path, category, children: grandchildren });
    }

    children.sort((a, b) => compareItalian(a.segment, b.segment));
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
    const children = group.children
      .map((level) => {
        const name = level.category?.name ?? level.path;
        const selfMatches = matchesCategoryQuery(name, query);
        const grandchildren = level.children.filter((child) =>
          matchesCategoryQuery(child.name, query),
        );

        if (!selfMatches && grandchildren.length === 0) {
          return null;
        }

        return { ...level, children: grandchildren };
      })
      .filter((level): level is CategoryLevel2 => level !== null);

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

export type SettingsCategoryRow =
  | {
      kind: "group";
      path: string;
      label: string;
      category: MovementCategory | null;
      expandable: boolean;
      open: boolean;
      depth: 0 | 1;
    }
  | {
      kind: "child";
      label: string;
      category: MovementCategory;
      depth: 2;
    };

export function buildSettingsCategoryRows(
  categories: MovementCategory[],
  expanded: ReadonlySet<string>,
  query: string,
): SettingsCategoryRow[] {
  const byId = new Map(
    categories.map((category) => [category.id, category]),
  );
  const groups = filterCategoryGroups(
    buildCategoryGroups(categories),
    query,
  );
  const isSearching = query.trim().length > 0;
  const rows: SettingsCategoryRow[] = [];

  for (const group of groups) {
    const expandable = group.children.length > 0;
    const open = expandable && (isSearching || expanded.has(group.root));
    rows.push({
      kind: "group",
      path: group.root,
      label: group.root,
      category: group.rootCategory
        ? (byId.get(group.rootCategory.id) ?? null)
        : null,
      expandable,
      open,
      depth: 0,
    });

    if (!open) {
      continue;
    }

    for (const level of group.children) {
      const levelExpandable = level.children.length > 0;
      const levelOpen =
        levelExpandable && (isSearching || expanded.has(level.path));
      rows.push({
        kind: "group",
        path: level.path,
        label: level.segment,
        category: level.category ? (byId.get(level.category.id) ?? null) : null,
        expandable: levelExpandable,
        open: levelOpen,
        depth: 1,
      });

      if (!levelOpen) {
        continue;
      }

      for (const child of level.children) {
        const category = byId.get(child.id);
        if (!category) {
          continue;
        }

        rows.push({
          kind: "child",
          label: child.label,
          category,
          depth: 2,
        });
      }
    }
  }

  return rows;
}
