-- Migration: add validation constraints (run after review)
ALTER TABLE members ALTER COLUMN first_name SET NOT NULL;
ALTER TABLE members ALTER COLUMN phone SET NOT NULL;
ALTER TABLE members ADD CONSTRAINT members_phone_unique UNIQUE (phone);
ALTER TABLE members ADD CONSTRAINT members_phone_check CHECK (phone ~ '^\d{10}$');

ALTER TABLE finance_records ALTER COLUMN amount SET NOT NULL;
ALTER TABLE finance_records ADD CONSTRAINT finance_amount_check CHECK (amount > 0);

ALTER TABLE visitors ALTER COLUMN name SET NOT NULL;
ALTER TABLE visitors ALTER COLUMN phone SET NOT NULL;
