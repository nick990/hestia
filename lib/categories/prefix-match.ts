export function matchesCategoryPrefix(
  categoryName: string,
  prefix: string,
): boolean {
  return categoryName === prefix || categoryName.startsWith(`${prefix}.`);
}

export function applyCategoryPrefixRename(
  categoryName: string,
  fromPrefix: string,
  toPrefix: string,
): string {
  if (categoryName === fromPrefix) {
    return toPrefix;
  }

  return `${toPrefix}${categoryName.slice(fromPrefix.length)}`;
}

export function filterCategoriesByPrefix<
  T extends { name: string },
>(categories: T[], prefix: string): T[] {
  return categories.filter((category) =>
    matchesCategoryPrefix(category.name, prefix),
  );
}
