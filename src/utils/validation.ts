// Shared validation utilities. Every form uses these so rules are identical.

// Remove invisible / problematic characters and normalise whitespace.
export const cleanText = (value: string): string =>
  (value || '')
    .replace(/[\u200B-\u200D\u2060\uFEFF]/g, '') // zero-width
    .replace(/\u00A0/g, ' ')                      // non-breaking space
    .replace(/[\u2018\u2019]/g, "'")              // smart single quotes
    .replace(/[\u201C\u201D]/g, '"')              // smart double quotes
    .replace(/\s+/g, ' ')                          // collapse spaces
    .trim();

// Generic free-text (topics, titles, locations, notes): required, length, no HTML.
export const validateText = (
  value: string,
  field = 'Text',
  min = 1,
  max = 200
): string | null => {
  const cleaned = cleanText(value);
  if (!cleaned) return `${field} is required.`;
  if (/<\s*script|<\s*\/\s*script|<[^>]+>/i.test(value)) return `${field} cannot contain HTML or code.`;
  if (cleaned.length < min) return `${field} must be at least ${min} characters.`;
  if (cleaned.length > max) return `${field} must be ${max} characters or fewer.`;
  return null;
};

export const validatePhone = (phone: string): string | null => {
  if (!phone.trim()) return 'Phone number is required.';
  const cleaned = phone.replace(/[\s\-().]/g, '');
  if (/[^\d+]/.test(cleaned)) return 'Phone number can only contain digits.';
  let digits = cleaned.startsWith('+') ? cleaned.slice(1) : cleaned;
  if (!digits) return 'Phone number is required.';

  if (digits.startsWith('233')) digits = digits.slice(3);
  const national = digits.startsWith('0') ? digits.slice(1) : digits;

  if (national.length < 9) return 'Phone number is too short. Enter 10 digits, for example 0245683836.';
  if (national.length > 9) return 'Phone number is too long. Enter 10 digits, for example 0245683836.';
  return null;
};

export const formatPhone = (phone: string): string => {
  let digits = phone.replace(/[\s\-().]/g, '').replace(/\D/g, '');
  if (digits.startsWith('233')) digits = digits.slice(3);
  if (digits.startsWith('0')) digits = digits.slice(1);
  return `+233${digits}`;
};

// Money: strip currency symbols/commas, reject negatives, >2 decimals, sci notation, huge values.
export const validateAmount = (amount: string | number, allowZero = false): string | null => {
  const raw = String(amount).replace(/[₵$,\s]/g, '');
  if (raw === '') return allowZero ? null : 'Enter an amount greater than 0.';
  if (!/^\d*\.?\d+$/.test(raw)) return 'Enter a valid amount using digits only.';
  const n = Number(raw);
  if (n < 0) return 'Enter an amount greater than 0.';
  if (!allowZero && n === 0) return 'Enter an amount greater than 0.';
  const decimals = raw.split('.')[1]?.length || 0;
  if (decimals > 2) return 'Amount can have at most 2 decimal places.';
  if (n > 10000000) return 'Amount looks too large. Please check it.';
  return null;
};

export const validateCount = (count: string | number): string | null => {
  const raw = String(count).trim();
  if (!/^\d+$/.test(raw)) return 'Number must be a whole number, 0 or more.';
  const n = Number(raw);
  if (n > 100000) return 'Number looks too large. Please check it.';
  return null;
};

export const validateEmail = (email: string): string | null => {
  if (!email.trim()) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'Enter a valid email address, for example name@example.com.';
  return null;
};

// Person names only (first/last/full): letters incl. accented, spaces, hyphen, apostrophe.
export const validateName = (name: string, field = 'Name'): string | null => {
  const cleaned = cleanText(name);
  if (!cleaned) return `${field} is required.`;
  if (cleaned.length < 2) return `${field} must be at least 2 characters.`;
  if (cleaned.length > 60) return `${field} must be 60 characters or fewer.`;
  if (!/^[\p{L}\s'-]+$/u.test(name)) return `Enter a valid ${field.toLowerCase()} (letters only).`;
  return null;
};

export const validateDateNotFuture = (date: string, field = 'Date'): string | null => {
  if (!date) return `${field} is required.`;
  if (new Date(date) > new Date()) return `${field} cannot be in the future.`;
  return null;
};

export const validateDob = (dob: string): string | null => {
  if (!dob) return 'Date of birth is required.';
  const d = new Date(dob);
  const now = new Date();
  if (d > now) return 'Date of birth cannot be in the future.';
  const age = now.getFullYear() - d.getFullYear();
  if (age > 120 || age < 0) return 'Enter a valid date of birth.';
  return null;
};