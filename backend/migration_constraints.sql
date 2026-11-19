-- =============================================================================
-- CPI Church Management — FULL DATABASE VALIDATION MIGRATION
-- Review, then run in Supabase SQL Editor. CHECK constraints are added NOT VALID
-- so existing bad rows do not block the migration. Clean bad rows (section 5)
-- then VALIDATE (section 4). Future-date checks use triggers (section 3).
-- =============================================================================

-- 1. PHONE FORMAT (Ghana: stored as +233XXXXXXXXX)
DO $$ BEGIN
  ALTER TABLE public.members ADD CONSTRAINT members_phone_format_check
    CHECK (phone ~ '^\+233[0-9]{9}$') NOT VALID;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.visitors ADD CONSTRAINT visitors_phone_format_check
    CHECK (phone ~ '^\+233[0-9]{9}$') NOT VALID;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.profiles ADD CONSTRAINT profiles_phone_format_check
    CHECK (phone IS NULL OR phone ~ '^\+233[0-9]{9}$') NOT VALID;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- 2. EMAIL FORMAT
DO $$ BEGIN
  ALTER TABLE public.members ADD CONSTRAINT members_email_format_check
    CHECK (email IS NULL OR email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$') NOT VALID;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.visitors ADD CONSTRAINT visitors_email_format_check
    CHECK (email IS NULL OR email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$') NOT VALID;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- 3. UNIQUENESS
DO $$ BEGIN
  ALTER TABLE public.members ADD CONSTRAINT members_phone_unique UNIQUE (phone);
EXCEPTION WHEN duplicate_object OR duplicate_table OR unique_violation THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.members ADD CONSTRAINT members_email_unique UNIQUE (email);
EXCEPTION WHEN duplicate_object OR duplicate_table OR unique_violation THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.visitors ADD CONSTRAINT visitors_phone_unique UNIQUE (phone);
EXCEPTION WHEN duplicate_object OR duplicate_table OR unique_violation THEN NULL; END $$;

-- 4. TEXT LENGTH LIMITS
DO $$ BEGIN
  ALTER TABLE public.members ADD CONSTRAINT members_name_len_check
    CHECK (char_length(first_name) BETWEEN 2 AND 60 AND char_length(last_name) BETWEEN 1 AND 60) NOT VALID;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.members ADD CONSTRAINT members_notes_len_check
    CHECK (general_notes IS NULL OR char_length(general_notes) <= 5000) NOT VALID;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.visitors ADD CONSTRAINT visitors_name_len_check
    CHECK (char_length(name) BETWEEN 2 AND 60) NOT VALID;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.cell_meetings ADD CONSTRAINT cell_meetings_topic_len_check
    CHECK (char_length(topic) BETWEEN 2 AND 200) NOT VALID;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.announcements ADD CONSTRAINT announcements_len_check
    CHECK (char_length(title) BETWEEN 2 AND 120 AND char_length(content) BETWEEN 1 AND 2000) NOT VALID;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.church_events ADD CONSTRAINT church_events_len_check
    CHECK (char_length(title) BETWEEN 2 AND 120 AND char_length(location) BETWEEN 2 AND 160
           AND char_length(description) <= 5000) NOT VALID;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.chat_messages ADD CONSTRAINT chat_messages_len_check
    CHECK (char_length(content) BETWEEN 1 AND 5000) NOT VALID;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- 5. NUMERIC RANGES
DO $$ BEGIN
  ALTER TABLE public.finance_records ADD CONSTRAINT finance_amount_positive_check
    CHECK (amount > 0 AND amount <= 10000000) NOT VALID;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.cell_meetings ADD CONSTRAINT cell_meetings_offering_check
    CHECK (offering_amount >= 0 AND offering_amount <= 10000000) NOT VALID;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.cell_meetings ADD CONSTRAINT cell_meetings_attendees_check
    CHECK (attendees_count >= 0 AND attendees_count <= 100000) NOT VALID;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.attendance_records ADD CONSTRAINT attendance_absences_check
    CHECK (consecutive_absences >= 0) NOT VALID;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.follow_up_tasks ADD CONSTRAINT follow_up_attempts_check
    CHECK (contact_attempts >= 0) NOT VALID;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.visitors ADD CONSTRAINT visitors_attempts_check
    CHECK (contact_attempts >= 0) NOT VALID;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- 6. ENUM / CATEGORY VALUE CHECKS
DO $$ BEGIN
  ALTER TABLE public.attendance_records ADD CONSTRAINT attendance_category_check
    CHECK (service_category IN ('sunday','midweek','vigil')) NOT VALID;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- 7. DATE TRIGGERS (one function per table)
DROP TRIGGER IF EXISTS trg_cpi_future_attendance ON public.attendance_records;
DROP TRIGGER IF EXISTS trg_cpi_future_meeting    ON public.cell_meetings;
DROP TRIGGER IF EXISTS trg_cpi_dob               ON public.members;
DROP FUNCTION IF EXISTS public.cpi_check_attendance_date();
DROP FUNCTION IF EXISTS public.cpi_check_meeting_date();
DROP FUNCTION IF EXISTS public.cpi_check_dob();

CREATE OR REPLACE FUNCTION public.cpi_check_attendance_date()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.service_date > CURRENT_DATE THEN
    RAISE EXCEPTION 'Attendance date cannot be in the future.' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.cpi_check_meeting_date()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.meeting_date > CURRENT_DATE THEN
    RAISE EXCEPTION 'Meeting date cannot be in the future.' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.cpi_check_dob()
RETURNS TRIGGER AS $$
BEGIN
  -- Reassignments update the member row without changing the DOB.
  IF (TG_OP = 'INSERT' OR NEW.date_of_birth IS DISTINCT FROM OLD.date_of_birth)
     AND NEW.date_of_birth IS NOT NULL AND
     (NEW.date_of_birth > CURRENT_DATE OR (CURRENT_DATE - NEW.date_of_birth) > 43800) THEN
    RAISE EXCEPTION 'Enter a valid date of birth.' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_cpi_future_attendance
  BEFORE INSERT OR UPDATE ON public.attendance_records
  FOR EACH ROW EXECUTE FUNCTION public.cpi_check_attendance_date();

CREATE TRIGGER trg_cpi_future_meeting
  BEFORE INSERT OR UPDATE ON public.cell_meetings
  FOR EACH ROW EXECUTE FUNCTION public.cpi_check_meeting_date();

CREATE TRIGGER trg_cpi_dob
  BEFORE INSERT OR UPDATE ON public.members
  FOR EACH ROW EXECUTE FUNCTION public.cpi_check_dob();

-- =============================================================================
-- 4. ACTIVATE (after cleaning bad rows — section 5)
-- =============================================================================
-- ALTER TABLE public.members            VALIDATE CONSTRAINT members_phone_format_check;
-- ALTER TABLE public.members            VALIDATE CONSTRAINT members_email_format_check;
-- ALTER TABLE public.members            VALIDATE CONSTRAINT members_name_len_check;
-- ALTER TABLE public.members            VALIDATE CONSTRAINT members_notes_len_check;
-- ALTER TABLE public.visitors           VALIDATE CONSTRAINT visitors_phone_format_check;
-- ALTER TABLE public.visitors           VALIDATE CONSTRAINT visitors_email_format_check;
-- ALTER TABLE public.visitors           VALIDATE CONSTRAINT visitors_name_len_check;
-- ALTER TABLE public.visitors           VALIDATE CONSTRAINT visitors_attempts_check;
-- ALTER TABLE public.profiles           VALIDATE CONSTRAINT profiles_phone_format_check;
-- ALTER TABLE public.cell_meetings      VALIDATE CONSTRAINT cell_meetings_topic_len_check;
-- ALTER TABLE public.cell_meetings      VALIDATE CONSTRAINT cell_meetings_offering_check;
-- ALTER TABLE public.cell_meetings      VALIDATE CONSTRAINT cell_meetings_attendees_check;
-- ALTER TABLE public.announcements      VALIDATE CONSTRAINT announcements_len_check;
-- ALTER TABLE public.church_events      VALIDATE CONSTRAINT church_events_len_check;
-- ALTER TABLE public.chat_messages      VALIDATE CONSTRAINT chat_messages_len_check;
-- ALTER TABLE public.finance_records    VALIDATE CONSTRAINT finance_amount_positive_check;
-- ALTER TABLE public.attendance_records VALIDATE CONSTRAINT attendance_absences_check;
-- ALTER TABLE public.attendance_records VALIDATE CONSTRAINT attendance_category_check;
-- ALTER TABLE public.follow_up_tasks    VALIDATE CONSTRAINT follow_up_attempts_check;

-- =============================================================================
-- 5. CLEANUP QUERIES (run to find existing bad rows before validating)
-- =============================================================================
--   SELECT id, first_name, last_name, phone FROM public.members WHERE phone !~ '^\+233[0-9]{9}$';
--   SELECT id, name, phone FROM public.visitors WHERE phone !~ '^\+233[0-9]{9}$';
--   SELECT phone, COUNT(*) FROM public.members GROUP BY phone HAVING COUNT(*) > 1;
--   SELECT phone, COUNT(*) FROM public.visitors GROUP BY phone HAVING COUNT(*) > 1;
--   SELECT email, COUNT(*) FROM public.members WHERE email IS NOT NULL GROUP BY email HAVING COUNT(*) > 1;
--   SELECT id, first_name, last_name FROM public.members WHERE char_length(first_name) < 2 OR char_length(last_name) < 1;
--   SELECT id, giver, amount FROM public.finance_records WHERE amount <= 0;
--   SELECT id, cell_name, offering_amount FROM public.cell_meetings WHERE offering_amount < 0;
--   SELECT id, cell_name, attendees_count FROM public.cell_meetings WHERE attendees_count < 0;
--   SELECT id, service_date FROM public.attendance_records WHERE service_date > CURRENT_DATE;
--   SELECT id, meeting_date FROM public.cell_meetings WHERE meeting_date > CURRENT_DATE;
--   SELECT id, first_name, date_of_birth FROM public.members
--     WHERE date_of_birth IS NOT NULL AND (date_of_birth > CURRENT_DATE OR (CURRENT_DATE - date_of_birth) > 43800);
--   SELECT DISTINCT service_category FROM public.attendance_records
--     WHERE service_category NOT IN ('sunday','midweek','vigil');

-- =============================================================================
-- 6. VERIFY
-- =============================================================================
--   SELECT conname, convalidated FROM pg_constraint
--   WHERE conname IN (
--     'members_phone_format_check','members_email_format_check','members_name_len_check',
--     'members_phone_unique','members_email_unique',
--     'visitors_phone_format_check','visitors_name_len_check',
--     'finance_amount_positive_check','cell_meetings_offering_check','cell_meetings_attendees_check',
--     'attendance_category_check','attendance_absences_check',
--     'announcements_len_check','church_events_len_check','chat_messages_len_check');
-- =============================================================================