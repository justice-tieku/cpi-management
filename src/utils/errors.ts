export function mapSupabaseError(err: any): string {
  if (!err) return 'Something went wrong. Please try again.';
  const code = err.code || err.status || '';
  const msg = (err.message || '').toLowerCase();
  const col = err.column || err.details?.match?.(/column "([^"]+)"/)?.[1];
  if (code === '23505') return `This ${col || 'record'} already exists.`;
  if (code === '23502') return `${col || 'A required field'} is required.`;
  if (code === '23503') return 'This record is linked to other records and cannot be changed. Remove related records first.';
  if (code === '23514') return 'One of the values does not meet the allowed rules. Please correct and try again.';
  if (code === '22P02') return `${col || 'A field'} has an invalid format.`;
  if (code === '42501') return 'You do not have permission to do this. Contact an administrator.';
  if (msg.includes('jwt') || msg.includes('expired') || code === 401) return 'Your session has expired. Please log in again.';
  if (msg.includes('network') || msg.includes('fetch')) return 'Cannot reach the server. Check your internet connection and try again.';
  return `Something went wrong. Please try again. (${err.message || 'unknown error'})`;
}
