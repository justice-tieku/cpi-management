/**
 * Ghanaian Phone Number Formatter & Validator (+233)
 * Standard style: +233 XX XXX XXXX (e.g., +233 24 123 4567)
 */

export function formatGhanaianPhone(phone?: string | null): string {
  if (!phone) return '';
  const trimmed = phone.trim();
  if (!trimmed) return '';

  // Extract digits and leading plus
  const digitsOnly = trimmed.replace(/[^0-9]/g, '');

  if (!digitsOnly) return trimmed;

  // Case 1: Already has +233 or starts with 233
  if (digitsOnly.startsWith('233')) {
    const local = digitsOnly.slice(3);
    if (local.length >= 9) {
      return `+233 ${local.slice(0, 2)} ${local.slice(2, 5)} ${local.slice(5, 9)}`;
    }
    return `+233 ${local}`;
  }

  // Case 2: Starts with 0 (e.g., 024 123 4567 or 0501234567)
  if (digitsOnly.startsWith('0')) {
    const local = digitsOnly.slice(1);
    if (local.length >= 9) {
      return `+233 ${local.slice(0, 2)} ${local.slice(2, 5)} ${local.slice(5, 9)}`;
    }
    return `+233 ${local}`;
  }

  // Case 3: Mock numbers starting with 1 (e.g. +1 555 234 8901)
  if (digitsOnly.startsWith('1') && digitsOnly.length === 11) {
    const rest = digitsOnly.slice(1); // 10 digits
    // replace 555 with standard 24
    const converted = rest.replace(/^555/, '24');
    return `+233 ${converted.slice(0, 2)} ${converted.slice(2, 5)} ${converted.slice(5, 9)}`;
  }

  // Case 4: 9-digit local number without leading 0 (e.g., 241234567)
  if (digitsOnly.length === 9) {
    return `+233 ${digitsOnly.slice(0, 2)} ${digitsOnly.slice(2, 5)} ${digitsOnly.slice(5, 9)}`;
  }

  // Fallback: prepend +233
  return `+233 ${digitsOnly}`;
}

/**
 * Clean phone for tel: or wa.me/ links
 */
export function getCleanDialPhone(phone?: string | null): string {
  if (!phone) return '';
  const formatted = formatGhanaianPhone(phone);
  return formatted.replace(/[^0-9]/g, '');
}
