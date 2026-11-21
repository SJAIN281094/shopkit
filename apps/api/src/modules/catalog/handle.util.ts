const MAX_HANDLE_LENGTH = 120;

/** "Blue Cotton Kurta (XL)" -> "blue-cotton-kurta-xl" */
export function toHandle(text: string, fallback: string): string {
  const handle = text
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_HANDLE_LENGTH)
    .replace(/-+$/g, '');
  return handle || fallback;
}

/** Picks `base`, or `base-2`, `base-3`… when taken. */
export function uniqueHandle(base: string, taken: Iterable<string>): string {
  const used = new Set(taken);
  if (!used.has(base)) return base;
  for (let n = 2; ; n++) {
    const candidate = `${base}-${n}`;
    if (!used.has(candidate)) return candidate;
  }
}
