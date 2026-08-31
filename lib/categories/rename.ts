export type CategoryNameRow = {
  id: string;
  name: string;
};

export type PrefixRenamePlan =
  | { ok: true; updates: CategoryNameRow[] }
  | { ok: false; error: string };

const NAME_MAX = 100;

function matchesPrefix(name: string, prefix: string): boolean {
  return name === prefix || name.startsWith(`${prefix}.`);
}

function applyPrefix(name: string, fromPrefix: string, toPrefix: string): string {
  if (name === fromPrefix) {
    return toPrefix;
  }

  return `${toPrefix}${name.slice(fromPrefix.length)}`;
}

export function planPrefixRename(
  categories: CategoryNameRow[],
  fromPrefixRaw: string,
  toPrefixRaw: string,
): PrefixRenamePlan {
  const fromPrefix = fromPrefixRaw.trim();
  const toPrefix = toPrefixRaw.trim();

  if (!fromPrefix || !toPrefix || toPrefix.length > NAME_MAX) {
    return { ok: false, error: "Nome non valido." };
  }

  if (fromPrefix === toPrefix) {
    return { ok: true, updates: [] };
  }

  const updates: CategoryNameRow[] = [];

  for (const category of categories) {
    if (!matchesPrefix(category.name, fromPrefix)) {
      continue;
    }

    const name = applyPrefix(category.name, fromPrefix, toPrefix);

    if (name.length > NAME_MAX) {
      return { ok: false, error: "Nome non valido." };
    }

    updates.push({ id: category.id, name });
  }

  if (updates.length === 0) {
    return { ok: false, error: "Nessuna categoria da spostare." };
  }

  const renamedIds = new Set(updates.map((update) => update.id));
  const taken = new Set(
    categories
      .filter((category) => !renamedIds.has(category.id))
      .map((category) => category.name.toLowerCase()),
  );
  const seenNew = new Set<string>();

  for (const update of updates) {
    const key = update.name.toLowerCase();
    if (taken.has(key) || seenNew.has(key)) {
      return {
        ok: false,
        error: "Esiste già una categoria con questo nome.",
      };
    }

    seenNew.add(key);
  }

  return { ok: true, updates };
}
