const NAME_MAX = 100;

export function parseCategoryName(raw: string): string | null {
  const trimmed = raw.trim();

  if (!trimmed || trimmed.length > NAME_MAX) {
    return null;
  }

  const parts = trimmed.split(".");
  if (parts.some((part) => part.length === 0)) {
    return null;
  }

  return trimmed;
}
