import { compareItalian } from "@/lib/categories/tree";

export function missingCategoryPrefixes(existingNames: string[]): string[] {
  const existing = new Set(
    existingNames.map((name) => name.trim().toLowerCase()).filter(Boolean),
  );
  const missing: string[] = [];
  const seen = new Set<string>();

  for (const name of existingNames) {
    const parts = name
      .split(".")
      .map((part) => part.trim())
      .filter(Boolean);

    for (let index = 1; index < parts.length; index += 1) {
      const prefix = parts.slice(0, index).join(".");
      const key = prefix.toLowerCase();

      if (existing.has(key) || seen.has(key)) {
        continue;
      }

      seen.add(key);
      missing.push(prefix);
    }
  }

  return missing.sort(compareItalian);
}
