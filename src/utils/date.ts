/**
 * Normalizes date input from any browser/locale format (e.g. DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD)
 * to PostgreSQL compatible ISO format: YYYY-MM-DD.
 * Returns null if the value is empty, invalid, or cannot be parsed.
 */
export function normalizeDate(val?: string | null): string | null {
  if (!val) return null;
  const trimmed = val.trim();
  if (!trimmed) return null;

  // Case 1: Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  // Case 2: DD/MM/YYYY or DD-MM-YYYY (e.g. 23/03/2007)
  const dmyMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  // Case 3: YYYY/MM/DD
  const ymdMatch = trimmed.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (ymdMatch) {
    const year = ymdMatch[1];
    const month = ymdMatch[2].padStart(2, '0');
    const day = ymdMatch[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Case 4: Standard JS Date parse fallback
  try {
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }
  } catch {
    // ignore
  }

  return null;
}
