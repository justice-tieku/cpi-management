-- =============================================================================
-- CPI Church Management — Input Validation Constraints Migration
-- DO NOT RUN YET. Review first. Constraints are added NOT VALID so existing rows
-- do not block the migration. Fix bad rows (see section 4b), then VALIDATE.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. PHONE FORMAT CHECK (Ghana: 10 digits 0XXXXXXXXX, or +233XXXXXXXXX)
--    Stored phones are normalised to +233XXXXXXXXX by the frontend.
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  ALTER TABLE public.members
    ADD CONSTRAINT members_phone_format_check
    CHECK (phone ~ '^\+233[0-9]{9}$')
    NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.visitors
    ADD CONSTRAINT visitors_phone_format_check
    CHECK (phone ~ '^\+233[0-9]{9}$')
    NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- -----------------------------------------------------------------------------
-- 2. UNIQUE PHONE / EMAIL (members)
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  ALTER TABLE public.members
    ADD CONSTRAINT members_phone_unique UNIQUE (phone);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.members
    ADD CONSTRAINT members_email_unique UNIQUE (email);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- -----------------------------------------------------------------------------
-- 3. REQUIRED COLUMNS (NOT NULL) — NOT VALID-safe via NOT VALID where possible.
--    NOT NULL cannot be NOT VALID; it must be validated against existing data.
--    Add these only after confirming no NULLs exist (see 4b queries).
-- -----------------------------------------------------------------------------
-- ALTER TABLE public.members      ALTER COLUMN first_name SET NOT NULL;
-- ALTER TABLE public.members      ALTER COLUMN phone      SET NOT NULL;

-- -----------------------------------------------------------------------------
-- 4. AMOUNT > 0 and reasonable bounds
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  ALTER TABLE public.finance_records
    ADD CONSTRAINT finance_amount_positive_check
    CHECK (amount > 0 AND amount <= 10000000)
    NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.cell_meetings
    ADD CONSTRAINT cell_meetings_offering_check
    CHECK (offering_amount >= 0 AND offering_amount <= 10000000)
    NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- -----------------------------------------------------------------------------
-- 5. COUNTS >= 0
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  ALTER TABLE public.cell_meetings
    ADD CONSTRAINT cell_meetings_attendees_check
    CHECK (attendees_count >= 0 AND attendees_count <= 100000)
    NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- -----------------------------------------------------------------------------
-- 6. FOREIGN KEYS (attendance -> members)
-- -----------------------------------------------------------------------------
-- Already present in base schema: attendance_records.member_id REFERENCES members(id)

-- =============================================================================
-- 4b. CLEANUP QUERIES — run these to find bad rows BEFORE validating constraints.
-- =============================================================================
--
-- Invalid phone numbers (not +233 + 9 digits):
--   SELECT id, first_name, last_name, phone FROM public.members
--   WHERE phone IS NOT NULL AND phone !~ '^\+233[0-9]{9}$';
--
-- NULL required fields:
--   SELECT id, first_name, phone FROM public.members
--   WHERE first_name IS NULL OR phone IS NULL;
--
-- Zero or negative amounts:
--   SELECT id, giver, amount FROM public.finance_records WHERE amount <= 0;
--
-- Negative offerings:
--   SELECT id, cell_name, offering_amount FROM public.cell_meetings WHERE offering_amount < 0;
--
-- Future-dated records (meetings should not be in the future):
--   SELECT id, cell_name, meeting_date FROM public.cell_meetings WHERE meeting_date > CURRENT_DATE;
--   SELECT id, member_name, service_date FROM public.attendance_records WHERE service_date > CURRENT_DATE;
--
-- Duplicate phones (would block the UNIQUE constraint):
--   SELECT phone, COUNT(*) FROM public.members GROUP BY phone HAVING COUNT(*) > 1;
-- =============================================================================