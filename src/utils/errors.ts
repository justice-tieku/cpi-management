// Shared backend/database error → plain-language message mapper.
// Every CRUD action should route its Supabase/API errors through this so the
// user always sees what went wrong and how to fix it.

export interface FriendlyError {
  message: string;
  technical?: string;
}

const COLUMN_LABELS: Record<string, string> = {
  phone: 'phone number',
  email: 'email address',
  first_name: 'first name',
  last_name: 'last name',
  full_name: 'name',
  title: 'title',
  content: 'message',
  amount: 'amount',
  attendees_count: 'number of attendees',
  date_of_birth: 'date of birth',
  meeting_date: 'meeting date',
  service_date: 'service date',
  event_date: 'event date',
  name: 'name',
  shepherd_id: 'shepherd',
  member_id: 'member'
};

function extractColumn(err: any): string | undefined {
  if (err?.column) return err.column;
  const text = `${err?.message || ''} ${err?.details || ''}`;
  const m = text.match(/column\s+"?([a-z_]+)"?/i);
  if (m) return m[1];
  const constraint = err?.constraint || err?.message || '';
  const cm = String(constraint).match(/"?([a-z_]+)"?_?key/i);
  return cm ? cm[1] : undefined;
}

function extractConstraint(err: any): string | undefined {
  const text = `${err?.constraint || ''} ${err?.message || ''} ${err?.details || ''}`;
  const match = text.match(/constraint\s+"?([a-z0-9_]+)"?/i);
  return match?.[1];
}

export function mapError(err: any, context = 'save'): FriendlyError {
  const code = String(err?.code || err?.status || '');
  const raw = err?.message || err?.details || '';
  const lower = raw.toLowerCase();
  const column = extractColumn(err);
  const label = column ? COLUMN_LABELS[column] || column.replace(/_/g, ' ') : undefined;
  const constraint = extractConstraint(err);

  // Network / reachability
  if (!code && lower.includes('failed to fetch')) {
    return { message: 'Cannot reach the server. Check your internet connection and try again.', technical: raw };
  }
  if (code === '401' || lower.includes('jwt') || lower.includes('expired')) {
    return { message: 'Your session has expired. Please log in again.', technical: raw };
  }

  switch (code) {
    case '42501':
      return {
        message: 'You do not have permission to do this. Please log in again or contact an administrator.',
        technical: raw
      };
    case '23505':
      return {
        message: label
          ? `This ${label} is already registered. Please use a different one.`
          : 'This record already exists.',
        technical: raw
      };
    case '23502':
      return { message: `${(label || 'A required field')!.replace(/^./, (c) => c.toUpperCase())} is required.`, technical: raw };
    case '23503':
      return {
        message: 'A linked member or shepherd record no longer exists, or it was removed from Supabase. Refresh the page and try again.',
        technical: raw
      };
    case '23514':
      // Custom friendly messages from triggers (future date / DOB) are passed through.
      if (raw && !/violates check constraint/i.test(raw)) {
        return { message: raw, technical: raw };
      }
      if (constraint === 'members_phone_format_check') {
        return {
          message: 'This member has an invalid phone number format. Edit the member and save a valid Ghana phone number, then try the assignment again.',
          technical: raw
        };
      }
      if (constraint === 'members_email_format_check') {
        return {
          message: 'This member has an invalid email address. Edit the member and save a valid email address, then try the assignment again.',
          technical: raw
        };
      }
      if (constraint === 'members_name_len_check') {
        return {
          message: 'This member has an invalid name. Edit the member and correct the name, then try the assignment again.',
          technical: raw
        };
      }
      return {
        message: label
          ? `The ${label} value does not meet the required rules. Please correct it and try again.`
          : 'One of the values does not meet the required rules. Please correct it and try again.',
        technical: raw
      };
    case '22P02':
      return { message: `The ${label || 'value'} has an invalid format. Please correct it.`, technical: raw };
    case 'PGRST204':
      return {
        message: `The server does not recognize a field that was sent (${extractColumn(err) || 'unknown column'}). Please reload the app and try again.`,
        technical: raw
      };
  }

  // PGRST204 also appears without code in message text
  if (lower.includes('could not find') && lower.includes('column')) {
    return {
      message: 'The server rejected the record because of a schema mismatch. Please reload the app and try again.',
      technical: raw
    };
  }
  if (lower.includes('duplicate key')) {
    return { message: `This ${label || 'record'} already exists.`, technical: raw };
  }

  return {
    message: `Unable to ${context}. Please check the details and try again.`,
    technical: raw || String(err)
  };
}