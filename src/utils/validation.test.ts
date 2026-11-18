import { validatePhone, formatPhone, validateAmount, validateCount, validateEmail, validateName } from './validation';

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

console.log('All validation tests passed.');