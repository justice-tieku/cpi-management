export const validatePhone = (phone: string): string | null => {
  if (!phone.trim()) return 'Phone number is required.';
  const cleaned = phone.replace(/[\s\-()]/g, '');
  if (/[^\d+]/.test(cleaned)) return 'Phone number can only contain digits.';
  let digits = cleaned.startsWith('+') ? cleaned.slice(1) : cleaned;
  if (!digits) return 'Phone number is required.';

  // Normalise an optional +233 / 233 country code to a local 10-digit number.
  if (digits.startsWith('233')) {
    digits = digits.slice(3);
  }
  // Strip a single leading 0 so we count the national significant digits.
  const national = digits.startsWith('0') ? digits.slice(1) : digits;

  if (national.length < 9) return 'Phone number is too short. Enter 10 digits, for example 0245683836.';
  if (national.length > 9) return 'Phone number is too long. Enter 10 digits, for example 0245683836.';
  return null;
};

export const formatPhone = (phone: string): string => {
  let digits = phone.replace(/[\s\-()]/g, '').replace(/\D/g, '');
  if (digits.startsWith('233')) digits = digits.slice(3);
  if (digits.startsWith('0')) digits = digits.slice(1);
  return `+233${digits}`;
};

export const validateAmount = (amount: string | number, allowZero = false): string | null => {
  const n = Number(amount);
  if (Number.isNaN(n)) return 'Enter an amount greater than 0.';
  if (n < 0) return 'Enter an amount greater than 0.';
  if (!allowZero && n === 0) return 'Enter an amount greater than 0.';
  if (amount.toString().split('.')[1]?.length > 2) return 'Amount can have at most 2 decimal places.';
  if (n > 10000000) return 'Amount looks too large. Please check it.';
  return null;
};

export const validateCount = (count: string | number): string | null => {
  const n = Number(count);
  if (!Number.isInteger(n) || n < 0) return 'Number must be a whole number, 0 or more.';
  if (n > 100000) return 'Number looks too large. Please check it.';
  return null;
};

export const validateEmail = (email: string): string | null => {
  if (!email.trim()) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Enter a valid email address, for example name@example.com.';
  return null;
};

export const validateName = (name: string, field = 'Name'): string | null => {
  if (!name.trim()) return `${field} is required.`;
  if (name.trim().length < 2) return `${field} must be at least 2 characters.`;
  if (!/^[A-Za-z\s'-]+$/.test(name)) return `Enter a valid ${field.toLowerCase()} (letters only).`;
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