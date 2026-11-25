import { validatePhone, formatPhone, validateAmount, validateCount, validateEmail, validateName } from './validation.ts';
import { getPpitAbsenceStreaks, getPpitRosterMembers } from './ppit.ts';

const assert = (cond: boolean, msg: string) => { if (!cond) throw new Error(msg); };

// Phone tests
assert(validatePhone('0245683836') === null, 'valid 10 digit');
assert(validatePhone('+233245683836') === null, 'valid +233');
assert(validatePhone('024568383') !== null, '9 digit invalid');
assert(validatePhone('02456838361') !== null, '11 digit invalid');
assert(validatePhone('02456abc36') !== null, 'letters invalid');
assert(validatePhone('') !== null, 'empty invalid');
assert(formatPhone('0245683836') === '+233245683836', 'format phone');

// Amount
assert(validateAmount('100') === null, 'valid amount');
assert(validateAmount('-5') !== null, 'negative invalid');
assert(validateAmount('10.123') !== null, '3 decimals invalid');
assert(validateAmount('0', false) !== null, 'zero invalid');

// Count
assert(validateCount('5') === null, 'valid count');
assert(validateCount('5.5') !== null, 'decimal count invalid');

// Email
assert(validateEmail('a@b.com') === null, 'valid email');
assert(validateEmail('bad') !== null, 'invalid email');

// Name
assert(validateName('John') === null, 'valid name');
assert(validateName('J') !== null, 'short name');
assert(validateName('John123') !== null, 'digits name');

const ppitStreaks = getPpitAbsenceStreaks([
  { ppit_member_id: 'one', session_date: '2026-03-01', status: 'Present' },
  { ppit_member_id: 'one', session_date: '2026-03-08', status: 'Absent' },
  { ppit_member_id: 'one', session_date: '2026-03-15', status: 'Absent' },
  { ppit_member_id: 'two', session_date: '2026-03-01', status: 'Absent' },
  { ppit_member_id: 'two', session_date: '2026-03-08', status: 'Absent' },
  { ppit_member_id: 'two', session_date: '2026-03-15', status: 'Absent' },
  { ppit_member_id: 'three', session_date: '2026-03-15', status: 'Present' }
]);
assert(ppitStreaks.get('one')?.count === 2, 'PPIT consecutive absences stop at the most recent presence');
assert(ppitStreaks.get('two')?.count === 3, 'PPIT consecutive absences reach critical threshold');
assert(ppitStreaks.get('three')?.count === 0, 'PPIT present member has no absence streak');

const ppitRoster = getPpitRosterMembers([
  { id: 'PPIT-001', name: 'Meeting leader' },
  { id: 'PPIT-002', name: 'Regular member' }
]);
assert(ppitRoster.length === 1 && ppitRoster[0].id === 'PPIT-002', 'PPIT meeting leader is excluded from the member roster');

console.log('All validation tests passed.');